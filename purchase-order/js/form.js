const OrderForm = (() => {
  let formItems = [{ materialId: '', quantity: 1, unitPrice: 0 }];

  function render() {
    return `
      <div class="form-overlay" id="formOverlay">
        <div class="form-panel">
          <div class="form-header">
            <h2 id="formTitle">新建采购订单</h2>
            <button class="btn-icon" onclick="OrderForm.close()">✕</button>
          </div>
          <div class="form-body">
            <div class="form-section">
              <h3>基本信息</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>订单编号</label>
                  <input type="text" id="orderId" readonly class="input-readonly" />
                </div>
                <div class="form-group">
                  <label>创建日期</label>
                  <input type="date" id="orderDate" readonly class="input-readonly" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>供应商 <span class="required">*</span></label>
                  <select id="supplierSelect" onchange="OrderForm.onSupplierChange()">
                    <option value="">请选择供应商</option>
                    ${MockData.suppliers.map(s => `<option value="${s.id}">${s.name}（${s.category}）</option>`).join('')}
                  </select>
                </div>
              </div>
              <div id="supplierInfo" class="supplier-info" style="display:none"></div>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>备注</label>
                  <textarea id="orderRemark" rows="2" placeholder="请输入备注信息..."></textarea>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3>采购明细</h3>
              <div class="items-header">
                <span class="col-name">物料名称</span>
                <span class="col-qty">数量</span>
                <span class="col-price">单价（元）</span>
                <span class="col-total">小计（元）</span>
                <span class="col-action">操作</span>
              </div>
              <div id="formItems"></div>
              <button class="btn-add-item" onclick="OrderForm.addItem()">+ 添加物料</button>
              <div class="form-total">
                <span>订单总额：</span>
                <span class="total-amount" id="formTotal">¥ 0.00</span>
              </div>
            </div>
          </div>
          <div class="form-footer">
            <button class="btn btn-secondary" onclick="OrderForm.close()">取消</button>
            <button class="btn btn-primary" onclick="OrderForm.save()">保存订单</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderFormItem(item, index) {
    const supplier = document.getElementById('supplierSelect');
    const supplierCategory = supplier ? MockData.getSupplier(supplier.value)?.category : null;
    const filteredMaterials = supplierCategory
      ? MockData.getMaterialsByCategory(supplierCategory)
      : MockData.materials;

    return `
      <div class="form-item-row" data-index="${index}">
        <div class="col-name">
          <select onchange="OrderForm.onMaterialChange(${index}, this.value)">
            <option value="">请选择物料</option>
            ${filteredMaterials.map(m => `<option value="${m.id}" ${m.id === item.materialId ? 'selected' : ''}>${m.name}（${m.category}）</option>`).join('')}
          </select>
        </div>
        <div class="col-qty">
          <input type="number" min="1" value="${item.quantity}" onchange="OrderForm.onQtyChange(${index}, this.value)" />
        </div>
        <div class="col-price">
          <input type="number" min="0" step="0.01" value="${item.unitPrice}" onchange="OrderForm.onPriceChange(${index}, this.value)" />
        </div>
        <div class="col-total">¥ ${(item.quantity * item.unitPrice).toFixed(2)}</div>
        <div class="col-action">
          <button class="btn-icon btn-danger" onclick="OrderForm.removeItem(${index})" ${formItems.length <= 1 ? 'disabled' : ''}>🗑</button>
        </div>
      </div>
    `;
  }

  function refreshItems() {
    const container = document.getElementById('formItems');
    if (container) {
      container.innerHTML = formItems.map((item, idx) => renderFormItem(item, idx)).join('');
    }
    updateTotal();
  }

  function updateTotal() {
    const total = MockData.calcOrderTotal(formItems);
    const el = document.getElementById('formTotal');
    if (el) el.textContent = `¥ ${total.toFixed(2)}`;
  }

  function onSupplierChange() {
    const supplierId = document.getElementById('supplierSelect').value;
    const info = document.getElementById('supplierInfo');
    if (supplierId) {
      const s = MockData.getSupplier(supplierId);
      info.style.display = 'block';
      info.innerHTML = `<div class="info-card"><span class="info-label">联系人：</span>${s.contact}<span class="info-sep">|</span><span class="info-label">电话：</span>${s.phone}<span class="info-sep">|</span><span class="info-label">类别：</span>${s.category}</div>`;
    } else {
      info.style.display = 'none';
    }
    formItems = [{ materialId: '', quantity: 1, unitPrice: 0 }];
    refreshItems();
  }

  function onMaterialChange(index, materialId) {
    formItems[index].materialId = materialId;
    if (materialId) {
      const m = MockData.getMaterial(materialId);
      formItems[index].unitPrice = m.unitPrice;
    }
    refreshItems();
  }

  function onQtyChange(index, value) {
    formItems[index].quantity = Math.max(1, parseInt(value) || 1);
    refreshItems();
  }

  function onPriceChange(index, value) {
    formItems[index].unitPrice = Math.max(0, parseFloat(value) || 0);
    refreshItems();
  }

  function addItem() {
    formItems.push({ materialId: '', quantity: 1, unitPrice: 0 });
    refreshItems();
  }

  function removeItem(index) {
    if (formItems.length > 1) {
      formItems.splice(index, 1);
      refreshItems();
    }
  }

  function open(orderToEdit) {
    const overlay = document.getElementById('formOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (orderToEdit) {
      document.getElementById('formTitle').textContent = '编辑采购订单';
      document.getElementById('orderId').value = orderToEdit.id;
      document.getElementById('orderDate').value = orderToEdit.createdAt;
      document.getElementById('supplierSelect').value = orderToEdit.supplierId;
      document.getElementById('orderRemark').value = orderToEdit.remark || '';
      onSupplierChange();
      formItems = orderToEdit.items.map(i => ({ ...i }));
      refreshItems();
    } else {
      document.getElementById('formTitle').textContent = '新建采购订单';
      document.getElementById('orderId').value = MockData.generateOrderId();
      document.getElementById('orderDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('supplierSelect').value = '';
      document.getElementById('orderRemark').value = '';
      formItems = [{ materialId: '', quantity: 1, unitPrice: 0 }];
      document.getElementById('supplierInfo').style.display = 'none';
      refreshItems();
    }
  }

  function close() {
    const overlay = document.getElementById('formOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function validate() {
    const supplierId = document.getElementById('supplierSelect').value;
    if (!supplierId) {
      alert('请选择供应商');
      return false;
    }
    const hasValidItem = formItems.some(i => i.materialId && i.quantity > 0);
    if (!hasValidItem) {
      alert('请至少添加一条有效的采购明细');
      return false;
    }
    return true;
  }

  function save() {
    if (!validate()) return;

    const order = {
      id: document.getElementById('orderId').value,
      supplierId: document.getElementById('supplierSelect').value,
      items: formItems.filter(i => i.materialId).map(i => ({ ...i })),
      status: 'draft',
      remark: document.getElementById('orderRemark').value,
      createdAt: document.getElementById('orderDate').value,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (typeof App !== 'undefined') {
      App.addOrder(order);
    }
    close();
  }

  return {
    render,
    open,
    close,
    save,
    onSupplierChange,
    onMaterialChange,
    onQtyChange,
    onPriceChange,
    addItem,
    removeItem
  };
})();
