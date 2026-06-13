"use client";

import { useMemo, useState } from "react";
import { Filter, Plus, SortAsc } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Input, Select } from "@/components/common/Field";
import { PageHeader } from "@/components/layout/PageHeader";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";
import type { ProjectAsset, ProjectAssetType } from "@/types/project";

const assetTypes: ProjectAssetType[] = [
  "PRD",
  "原型图",
  "流程图",
  "竞品分析",
  "用户调研",
  "项目截图",
  "GitHub 链接",
  "线上作品链接",
];

export default function AssetsPage() {
  const { projects, assets, setAssets } = useProjectPilotStore();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectAssetType>("PRD");
  const [url, setUrl] = useState("");
  const projectId = projects[0]?.id ?? "";
  const visibleAssets = useMemo(
    () => assets.filter((asset) => !projectId || asset.projectId === projectId),
    [assets, projectId],
  );

  function addAsset() {
    const asset: ProjectAsset = {
      id: crypto.randomUUID(),
      projectId,
      name: name.trim() || `${type} 资料`,
      type,
      url: url.trim(),
      createdAt: new Date().toISOString(),
    };
    setAssets([asset, ...assets]);
    setName("");
    setUrl("");
  }

  return (
    <AppShell searchPlaceholder="搜索项目资产...">
      <PageHeader
        title="项目资产库"
        description="管理您的设计稿、文档及其他专业资产。"
        action={
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-2"><SortAsc size={17} />排序</span>
            <span className="inline-flex items-center gap-2"><Filter size={17} />筛选</span>
          </div>
        }
      />

      <div className="mx-auto max-w-5xl rounded border border-[var(--border)] bg-white">
        <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[1fr_180px_1fr_auto]">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="资产名称" />
          <Select value={type} onChange={(event) => setType(event.target.value as ProjectAssetType)}>
            {assetTypes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Select>
          <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="链接或静态上传备注" />
          <Button onClick={addAsset} disabled={!projectId}>
            <Plus size={16} />
            添加
          </Button>
        </div>

        {!projectId ? (
          <div className="p-6">
            <EmptyState title="请先创建项目" description="资产需要关联到项目档案，第一版仅保存本地列表。" />
          </div>
        ) : visibleAssets.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[760px] divide-y divide-[var(--border)]">
            <div className="grid grid-cols-[1fr_160px_1fr_160px] bg-[var(--surface-panel)] px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">
              <span>项目名称</span>
              <span>类型</span>
              <span>链接 / 备注</span>
              <span>创建时间</span>
            </div>
            {visibleAssets.map((asset) => (
              <div key={asset.id} className="grid grid-cols-[1fr_160px_1fr_160px] px-4 py-3 text-sm">
                <span className="font-medium">{asset.name}</span>
                <span className="text-[var(--text-muted)]">{asset.type}</span>
                <span className="truncate text-[var(--text-muted)]">{asset.url || "静态上传入口"}</span>
                <span className="text-[var(--text-subtle)]">{new Date(asset.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState title="暂无项目资产" description="添加 PRD、原型图、流程图等资料后会显示在这里。" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
