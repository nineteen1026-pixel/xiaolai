const StatusFlow = (() => {
  const STATUS_MAP = {
    draft: { label: '草稿', color: '#90a4ae', bgColor: '#eceff1', icon: '📝' },
    pending: { label: '待审批', color: '#f57c00', bgColor: '#fff3e0', icon: '⏳' },
    approved: { label: '已审批', color: '#1565c0', bgColor: '#e3f2fd', icon: '✅' },
    purchasing: { label: '采购中', color: '#6a1b9a', bgColor: '#f3e5f5', icon: '🚚' },
    completed: { label: '已完成', color: '#2e7d32', bgColor: '#e8f5e9', icon: '🎉' },
    rejected: { label: '已驳回', color: '#c62828', bgColor: '#ffebee', icon: '❌' }
  };

  const FLOW_RULES = {
    draft: ['pending', 'rejected'],
    pending: ['approved', 'rejected'],
    approved: ['purchasing', 'rejected'],
    purchasing: ['completed'],
    completed: [],
    rejected: ['draft']
  };

  function getInfo(status) {
    return STATUS_MAP[status] || { label: status, color: '#999', bgColor: '#f5f5f5', icon: '❓' };
  }

  function getNextStatuses(currentStatus) {
    return (FLOW_RULES[currentStatus] || []).map(s => ({
      value: s,
      ...getInfo(s)
    }));
  }

  function canTransition(currentStatus, targetStatus) {
    return (FLOW_RULES[currentStatus] || []).includes(targetStatus);
  }

  function getAllStatuses() {
    return Object.entries(STATUS_MAP).map(([value, info]) => ({
      value,
      ...info
    }));
  }

  function renderStatusBadge(status) {
    const info = getInfo(status);
    return `<span class="status-badge" style="color:${info.color};background:${info.bgColor}">${info.icon} ${info.label}</span>`;
  }

  function renderFlowSteps(currentStatus) {
    const flowOrder = ['draft', 'pending', 'approved', 'purchasing', 'completed'];
    const currentIdx = flowOrder.indexOf(currentStatus);
    const isRejected = currentStatus === 'rejected';

    let html = '<div class="flow-steps">';
    flowOrder.forEach((s, idx) => {
      const info = getInfo(s);
      const isActive = idx <= currentIdx && !isRejected;
      const isCurrent = s === currentStatus;
      html += `<div class="flow-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}">
        <div class="step-dot" style="${isActive ? `background:${info.color}` : ''}">${isActive ? info.icon : idx + 1}</div>
        <div class="step-label" style="${isActive ? `color:${info.color}` : ''}">${info.label}</div>
      </div>`;
      if (idx < flowOrder.length - 1) {
        html += `<div class="flow-line ${idx < currentIdx && !isRejected ? 'active' : ''}"></div>`;
      }
    });
    if (isRejected) {
      const info = getInfo('rejected');
      html += `<div class="flow-step rejected current">
        <div class="step-dot" style="background:${info.color}">${info.icon}</div>
        <div class="step-label" style="color:${info.color}">${info.label}</div>
      </div>`;
    }
    html += '</div>';
    return html;
  }

  return {
    STATUS_MAP,
    FLOW_RULES,
    getInfo,
    getNextStatuses,
    canTransition,
    getAllStatuses,
    renderStatusBadge,
    renderFlowSteps
  };
})();
