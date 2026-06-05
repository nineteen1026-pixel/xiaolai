const OrderList = (() => {
  let filters = { keyword: '', status: '', supplierId: '' };

  function renderFilterBar() {
    return `
      <div class="filter-bar">
        <div class="filter-group">
          <input type="text" id="searchKeyword" placeholder="搜索订单编号 / 供应商名称..." 
                 oninput="OrderList.onFilterChange()" class="filter-input" />
        </div>
        <div class="filter-group">
          <select id="filterStatus" onchange="OrderList.onFilterChange()" class="filter-select">
            <option value="">全部状态</option>
            ${StatusFlow.getAllStatuses().map(s => `<option value="${s.value}">${s.icon} ${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <select id="filterSupplier" onchange="OrderList.onFilterChange()" class="filter-select">
            <option value="">全部供应商</option>
            ${MockData.suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-outline" onclick="OrderList.resetFilters()">重置</button>
      </div>
    `;
  }

  function getFilteredOrders() {
    let orders = typeof App !== 'undefined' ? App.getOrders() : [];
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      orders = orders.filter(o => {
        const supplier = MockData.getSupplier(o.supplierId);
        return o.id.toLowerCase().includes(kw) || (supplier && supplier.name.toLowerCase().includes(kw));
      });
    }
    if (filters.status) {
      orders = orders.filter(o => o.status === filters.status);
    }
    if (filters.supplierId) {
      orders = orders.filter(o => o.supplierId === filters.supplierId);
    }
    return orders;
  }

  function renderOrderRow(order) {
    const supplier = MockData.getSupplier(order.supplierId);
    const total = MockData.calcOrderTotal(order.items);
    const nextStatuses = StatusFlow.getNextStatuses(order.status);

    return `
      <tr class="order-row" data-id="${order.id}">
        <td class="td-id">${order.id}</td>
        <td class="td-supplier">${supplier ? supplier.name : '-'}</td>
        <td class="td-items">${order.items.length} 项</td>
        <td class="td-amount">¥ ${total.toFixed(2)}</td>
        <td class="td-status">${StatusFlow.renderStatusBadge(order.status)}</td>
        <td class="td-date">${order.updatedAt}</td>
        <td class="td-actions">
          <div class="action-group">
            <button class="btn-icon" title="查看详情" onclick="OrderList.viewDetail('${order.id}')">👁</button>
            ${order.status === 'draft' ? `<button class="btn-icon" title="编辑" onclick="OrderList.editOrder('${order.id}')">✏️</button>` : ''}
            ${nextStatuses.length > 0 ? `<button class="btn-icon btn-flow" title="状态流转" onclick="OrderList.showFlowModal('${order.id}')">🔄</button>` : ''}
            <button class="btn-icon btn-danger" title="删除" onclick="OrderList.deleteOrder('${order.id}')">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderTable() {
    const orders = getFilteredOrders();
    if (orders.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>暂无匹配的采购订单</p>
        </div>
      `;
    }
    return `
      <table class="order-table">
        <thead>
          <tr>
            <th>订单编号</th>
            <th>供应商</th>
            <th>明细数</th>
            <th>金额</th>
            <th>状态</th>
            <th>更新日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => renderOrderRow(o)).join('')}
        </tbody>
      </table>
    `;
  }

  function onFilterChange() {
    filters.keyword = document.getElementById('searchKeyword')?.value || '';
    filters.status = document.getElementById('filterStatus')?.value || '';
    filters.supplierId = document.getElementById('filterSupplier')?.value || '';
    refresh();
  }

  function resetFilters() {
    filters = { keyword: '', status: '', supplierId: '' };
    const sk = document.getElementById('searchKeyword');
    const fs = document.getElementById('filterStatus');
    const fsp = document.getElementById('filterSupplier');
    if (sk) sk.value = '';
    if (fs) fs.value = '';
    if (fsp) fsp.value = '';
    refresh();
  }

  function refresh() {
    const container = document.getElementById('orderListContainer');
    if (container) {
      container.innerHTML = renderTable();
    }
    if (typeof App !== 'undefined') {
      App.updateSummary();
    }
  }

  function viewDetail(orderId) {
    const orders = typeof App !== 'undefined' ? App.getOrders() : [];
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const supplier = MockData.getSupplier(order.supplierId);
    const total = MockData.calcOrderTotal(order.items);

    const modal = document.getElementById('detailModal');
    modal.querySelector('.detail-content').innerHTML = `
      <div class="detail-header">
        <h3>订单详情 - ${order.id}</h3>
        <button class="btn-icon" onclick="document.getElementById('detailModal').classList.remove('active')">✕</button>
      </div>
      <div class="detail-body">
        ${StatusFlow.renderFlowSteps(order.status)}
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">供应商</span><span class="detail-value">${supplier?.name || '-'}</span></div>
          <div class="detail-item"><span class="detail-label">联系人</span><span class="detail-value">${supplier?.contact || '-'} / ${supplier?.phone || '-'}</span></div>
          <div class="detail-item"><span class="detail-label">创建日期</span><span class="detail-value">${order.createdAt}</span></div>
          <div class="detail-item"><span class="detail-label">更新日期</span><span class="detail-value">${order.updatedAt}</span></div>
          <div class="detail-item"><span class="detail-label">状态</span><span class="detail-value">${StatusFlow.renderStatusBadge(order.status)}</span></div>
          <div class="detail-item"><span class="detail-label">备注</span><span class="detail-value">${order.remark || '无'}</span></div>
        </div>
        <h4>采购明细</h4>
        <table class="detail-items-table">
          <thead>
            <tr><th>物料</th><th>数量</th><th>单价</th><th>小计</th></tr>
          </thead>
          <tbody>
            ${order.items.map(i => {
              const m = MockData.getMaterial(i.materialId);
              return `<tr><td>${m?.name || i.materialId}</td><td>${i.quantity} ${m?.unit || ''}</td><td>¥ ${i.unitPrice.toFixed(2)}</td><td>¥ ${(i.quantity * i.unitPrice).toFixed(2)}</td></tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="3" style="text-align:right;font-weight:600">合计</td><td style="font-weight:700;color:#1565c0">¥ ${total.toFixed(2)}</td></tr>
          </tfoot>
        </table>
      </div>
    `;
    modal.classList.add('active');
  }

  function editOrder(orderId) {
    const orders = typeof App !== 'undefined' ? App.getOrders() : [];
    const order = orders.find(o => o.id === orderId);
    if (order) OrderForm.open(order);
  }

  function deleteOrder(orderId) {
    if (!confirm(`确认删除订单 ${orderId}？`)) return;
    if (typeof App !== 'undefined') {
      App.removeOrder(orderId);
    }
  }

  function showFlowModal(orderId) {
    const orders = typeof App !== 'undefined' ? App.getOrders() : [];
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const nextStatuses = StatusFlow.getNextStatuses(order.status);
    const modal = document.getElementById('flowModal');
    modal.querySelector('.flow-content').innerHTML = `
      <div class="detail-header">
        <h3>状态流转 - ${order.id}</h3>
        <button class="btn-icon" onclick="document.getElementById('flowModal').classList.remove('active')">✕</button>
      </div>
      <div class="flow-modal-body">
        ${StatusFlow.renderFlowSteps(order.status)}
        <div class="flow-actions">
          <p class="flow-current">当前状态：${StatusFlow.renderStatusBadge(order.status)}</p>
          <p class="flow-next-label">可流转至：</p>
          <div class="flow-next-btns">
            ${nextStatuses.map(s => `
              <button class="btn btn-flow-action" style="color:${s.color};border-color:${s.color}" 
                      onclick="OrderList.transitionStatus('${orderId}', '${s.value}')">
                ${s.icon} ${s.label}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    modal.classList.add('active');
  }

  function transitionStatus(orderId, targetStatus) {
    if (typeof App !== 'undefined') {
      App.transitionOrderStatus(orderId, targetStatus);
    }
    document.getElementById('flowModal').classList.remove('active');
  }

  return {
    renderFilterBar,
    renderTable,
    onFilterChange,
    resetFilters,
    refresh,
    viewDetail,
    editOrder,
    deleteOrder,
    showFlowModal,
    transitionStatus
  };
})();
