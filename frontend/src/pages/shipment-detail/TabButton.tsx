export type Tab = 'overview' | 'documents' | 'issues' | 'report' | 'audit';

export function TabButton({
  id,
  tab,
  setTab,
  count,
  children,
}: {
  id: Tab;
  tab: Tab;
  setTab: (t: Tab) => void;
  count?: number;
  children: string;
}) {
  return (
    <button className="tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
      {children}
      {count !== undefined && <span className="tab-count">{count}</span>}
    </button>
  );
}
