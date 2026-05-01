import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal, Popconfirm, Progress, Select, Space, Table, Tag, Typography, message } from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined,
  PlayCircleOutlined, DownloadOutlined, UploadOutlined, SortAscendingOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchTestCases, deleteTestCase, executeTestCase, importTestCases } from "../services/testCases";
import { fetchLatestPerCase } from "../services/executionLogs";
import type { TestCase } from "../types";

export function TestCaseListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const [rowResults, setRowResults] = useState<Record<string, { status: string; duration: number }>>({});

  const handleRowExecute = async (record: TestCase) => {
    setExecutingIds((prev) => new Set(prev).add(record.id));
    try {
      const result = await executeTestCase(record.id);
      setRowResults((prev) => ({ ...prev, [record.id]: { status: result.status, duration: result.duration_ms ?? 0 } }));
      queryClient.invalidateQueries({ queryKey: ["execution-logs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch {
      message.error(`${record.name} 执行失败`);
    } finally {
      setExecutingIds((prev) => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  };
  const [batchResults, setBatchResults] = useState<Array<{ name: string; status: string; message: string }>>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["test-cases"],
    queryFn: fetchTestCases,
  });

  // 最近执行状态映射（轻量聚合端点）
  const { data: latestStatuses } = useQuery({
    queryKey: ["latest-per-case"],
    queryFn: fetchLatestPerCase,
    refetchInterval: 30_000,
  });
  const lastStatusMap = new Map<string, { status: string; duration: number }>();
  if (latestStatuses) {
    for (const s of latestStatuses) {
      lastStatusMap.set(s.test_case_id, { status: s.status, duration: s.duration_ms ?? 0 });
    }
  }

  const filteredData = data?.filter((tc) => {
    if (searchText && !tc.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (tagFilter !== "all" && (!tc.tags || !tc.tags.includes(tagFilter))) return false;
    return true;
  });

  const allTags = [...new Set((data ?? []).flatMap((tc) => tc.tags ?? []))];

  const deleteMutation = useMutation({
    mutationFn: deleteTestCase,
    onSuccess: () => {
      message.success("已删除");
      queryClient.invalidateQueries({ queryKey: ["test-cases"] });
      setDeleting(null);
    },
    onError: () => {
      message.error("删除失败");
      setDeleting(null);
    },
  });

  // 批量执行
  const handleBatchExecute = async () => {
    if (selectedRowKeys.length === 0) return;
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: selectedRowKeys.length });
    const results: Array<{ name: string; status: string; message: string }> = [];

    for (const id of selectedRowKeys) {
      const tc = data?.find((c) => c.id === id);
      try {
        const result = await executeTestCase(id as string);
        results.push({
          name: tc?.name ?? id as string,
          status: result.status,
          message: result.assertion_results?.map((r: Record<string, unknown>) => (r.passed ? "OK" : "FAIL")).join(" ") || result.error_message || "-",
        });
      } catch {
        results.push({ name: tc?.name ?? id as string, status: "error", message: "请求失败" });
      }
      setBatchProgress({ done: results.length, total: selectedRowKeys.length });
    }

    setBatchResults(results);
    setBatchRunning(false);
    setSelectedRowKeys([]);
    queryClient.invalidateQueries({ queryKey: ["execution-logs"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  // 批量删除
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  const handleExport = () => {
    // 有选中项 → 导出选中；无选中 → 全量导出
    const source = selectedRowKeys.length > 0
      ? (data ?? []).filter((tc) => selectedRowKeys.includes(tc.id))
      : (data ?? []);
    const exportData = source.map((tc) => ({
      name: tc.name, description: tc.description, protocol: tc.protocol,
      message_definition: tc.message_definition, assertion_rules: tc.assertion_rules, variables: tc.variables,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `autocc-test-cases-${exportData.length}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importTestCases(file);
      setImportResult({ count: result.length });
      queryClient.invalidateQueries({ queryKey: ["test-cases"] });
    } catch {
      message.error("导入失败，请检查文件格式");
    } finally {
      e.target.value = "";
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    setBatchDeleting(true);
    let ok = 0;
    for (const id of selectedRowKeys) {
      try {
        await deleteTestCase(id as string);
        ok++;
      } catch { /* skip */ }
    }
    message.success(`已删除 ${ok}/${selectedRowKeys.length} 个用例`);
    setSelectedRowKeys([]);
    setBatchDeleting(false);
    queryClient.invalidateQueries({ queryKey: ["test-cases"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      sorter: (a: TestCase, b: TestCase) => a.name.localeCompare(b.name),
      render: (name: string, record: TestCase) => (
        <Button type="link" onClick={() => navigate(`/test-cases/${record.id}`)}>{name}</Button>
      ),
    },
    {
      title: "协议",
      dataIndex: "protocol",
      key: "protocol",
      width: 100,
      sorter: (a: TestCase, b: TestCase) => a.protocol.localeCompare(b.protocol),
      render: (p: string) => <Tag color="blue">{p}</Tag>,
    },
    {
      title: "上次执行",
      key: "lastStatus",
      width: 100,
      render: (_: unknown, record: TestCase) => {
        const s = lastStatusMap.get(record.id);
        if (!s) return <Typography.Text type="secondary">-</Typography.Text>;
        return (
          <Space size={4}>
            <Tag color={s.status === "passed" ? "success" : "error"}>{s.status === "passed" ? "通过" : "失败"}</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>{s.duration}ms</Typography.Text>
          </Space>
        );
      },
    },
    {
      title: "标签",
      dataIndex: "tags",
      key: "tags",
      width: 160,
      render: (tags: string[] | null) =>
        tags?.length ? tags.map((t) => <Tag key={t}>{t}</Tag>) : "-",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (d: string | null) => d || "-",
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 200,
      sorter: (a: TestCase, b: TestCase) => a.created_at.localeCompare(b.created_at),
      render: (t: string) => new Date(t).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      render: (_: unknown, record: TestCase) => {
        const rowRes = rowResults[record.id];
        return (
          <Space>
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              loading={executingIds.has(record.id)}
              onClick={() => handleRowExecute(record)}
            >
              执行
            </Button>
            {rowRes && (
              <Tag color={rowRes.status === "passed" ? "success" : "error"}>
                {rowRes.duration}ms
              </Tag>
            )}
            <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/test-cases/${record.id}/edit`)}>
              编辑
            </Button>
            <Popconfirm
              title="确认删除"
              description={`确定删除「${record.name}」?`}
              onConfirm={() => {
                setDeleting(record.id);
                deleteMutation.mutate(record.id);
              }}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" danger icon={<DeleteOutlined />} loading={deleting === record.id}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>测试用例</Typography.Title>
        <Space>
          <Input
            placeholder="搜索用例名称"
            prefix={<SearchOutlined />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            value={tagFilter}
            onChange={setTagFilter}
            style={{ width: 120 }}
            options={[{ value: "all", label: "全部标签" }, ...allTags.map((t) => ({ value: t, label: t }))]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            {selectedRowKeys.length > 0 ? `导出选中(${selectedRowKeys.length})` : "全部导出"}
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>导入</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/test-cases/new")}>
            新建用例
          </Button>
        </Space>
      </div>

      {/* 批量操作栏 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, padding: "8px 16px", background: "#e6f4ff", borderRadius: 6, display: "flex", alignItems: "center", gap: 16 }}>
          <span>已选 <strong>{selectedRowKeys.length}</strong> 项</span>
          <Button
            icon={<PlayCircleOutlined />}
            loading={batchRunning}
            onClick={handleBatchExecute}
          >
            批量执行
          </Button>
          <Popconfirm
            title="批量删除"
            description={`确定删除选中的 ${selectedRowKeys.length} 个用例？`}
            onConfirm={handleBatchDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} loading={batchDeleting}>批量删除</Button>
          </Popconfirm>
          <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
          {batchRunning && (
            <Progress percent={Math.round((batchProgress.done / batchProgress.total) * 100)} style={{ flex: 1, maxWidth: 200 }} />
          )}
        </div>
      )}

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={isLoading}
        locale={{
          emptyText: isError ? (
            <div style={{ padding: 40 }}><Typography.Text type="danger">加载失败</Typography.Text><br /><Button onClick={() => refetch()} style={{ marginTop: 8 }}>重试</Button></div>
          ) : (
            <div style={{ padding: 40 }}>
              <Typography.Text type="secondary">暂无测试用例</Typography.Text><br />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/test-cases/new")} style={{ marginTop: 12 }}>新建第一个用例</Button>
            </div>
          ),
        }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
      />

      {/* 批量执行结果弹窗 */}
      <Modal
        open={batchResults.length > 0}
        title="批量执行结果"
        footer={<Button type="primary" onClick={() => setBatchResults([])}>确定</Button>}
        onCancel={() => setBatchResults([])}
        width={600}
      >
        <Table
          dataSource={batchResults}
          rowKey="name"
          size="small"
          pagination={false}
          columns={[
            { title: "用例", dataIndex: "name", key: "name" },
            {
              title: "状态", dataIndex: "status", key: "status", width: 90,
              render: (s: string) => <Tag color={s === "passed" ? "success" : "error"}>{s}</Tag>,
            },
            { title: "详情", dataIndex: "message", key: "message", ellipsis: true },
          ]}
        />
      </Modal>

      {/* 导入弹窗 */}
      <Modal
        open={importOpen}
        title="导入测试用例"
        footer={null}
        onCancel={() => { setImportOpen(false); setImportResult(null); }}
      >
        {importResult ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Typography.Text type="success" strong>成功导入 {importResult.count} 个测试用例</Typography.Text>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Typography.Paragraph>选择 JSON 文件批量导入测试用例</Typography.Paragraph>
            <input type="file" accept=".json" onChange={handleImport} />
          </div>
        )}
      </Modal>
    </>
  );
}
