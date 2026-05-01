import { Button, Typography } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { copyToClipboard } from "../lib/clipboard";
import { message } from "antd";

interface JsonBlockProps {
  title: string;
  data: unknown;
}

export function JsonBlock({ title, data }: JsonBlockProps) {
  const handleCopy = async () => {
    await copyToClipboard(JSON.stringify(data, null, 2));
    message.success("已复制");
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
        <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>复制</Button>
      </div>
      <pre style={{
        background: "#f6f8fa", border: "1px solid #e8e8e8", borderRadius: 8,
        padding: 16, maxHeight: 300, overflow: "auto", fontSize: 13, marginTop: 8,
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </>
  );
}
