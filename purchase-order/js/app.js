const App = (() => {
  let orders = [];

  function init() {
    orders = MockData.generateInitialOrders();
    render();
  }

  function render() {
    renderSummary();
    document.getElementById('filterBarContainer').innerHTML = OrderList.renderFilterBar();
    document.getElementById('orderListContainer').innerHTML = OrderList.renderTable();
  }

  function renderSummary() {
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + MockData.calcOrderTotal(o.items), 0);
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const approvedCount = orders.filter(o => o.status === 'approved').length;
    const purchasingCount = orders.filter(o => o.status === 'purchasing').length;
    const draftCount = orders.filter(o => o.status === 'draft').length;

    document.getElementById('summaryContainer').innerHTML = `
      <div class="summary-card card-total">
        <div class="summary-icon">📋</div>
        <div class="summary-info">
          <div class="summary-value">${totalOrders}</div>
          <div class="summary-label">订单总数</div>
        </div>
      </div>
      <div class="summary-card card-amount">
        <div class="summary-icon">💰</div>
        <div class="summary-info">
          <div class="summary-value">¥ ${totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          <div class="summary-label">总金额</div>
        </div>
      </div>
      <div class="summary-card card-pending">
        <div class="summary-icon">⏳</div>
        <div class="summary-info">
          <div class="summary-value">${pendingCount}</div>
          <div class="summary-label">待审批</div>
        </div>
      </div>
      <div class="summary-card card-approved">
        <div class="summary-icon">✅</div>
        <div class="summary-info">
          <div class="summary-value">${approvedCount}</div>
          <div class="summary-label">已审批</div>
        </div>
      </div>
      <div class="summary-card card-purchasing">
        <div class="summary-icon">🚚</div>
        <div class="summary-info">
          <div class="summary-value">${purchasingCount}</div>
          <div class="summary-label">采购中</div>
        </div>
      </div>
      <div class="summary-card card-completed">
        <div class="summary-icon">🎉</div>
        <div class="summary-info">
          <div class="summary-value">${completedCount}</div>
          <div class="summary-label">已完成</div>
        </div>
      </div>
    `;
  }

  function getOrders() {
    return [...orders];
  }

  function addOrder(order) {
    const existing = orders.find(o => o.id === order.id);
    if (existing) {
      Object.assign(existing, order, { updatedAt: new Date().toISOString().split('T')[0] });
    } else {
      orders.unshift(order);
    }
    render();
  }

  function removeOrder(orderId) {
    orders = orders.filter(o => o.id !== orderId);
    render();
  }

  function transitionOrderStatus(orderId, targetStatus) {
    const order = orders.find(o => o.id === orderId);
    if (order && StatusFlow.canTransition(order.status, targetStatus)) {
      order.status = targetStatus;
      order.updatedAt = new Date().toISOString().split('T')[0];
      render();
    }
  }

  function updateSummary() {
    renderSummary();
  }

  return {
    init,
    getOrders,
    addOrder,
    removeOrder,
    transitionOrderStatus,
    updateSummary
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
