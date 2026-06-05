const MockData = (() => {
  const suppliers = [
    { id: 'S001', name: '华科电子科技有限公司', contact: '张明', phone: '138-0000-1001', category: '电子元器件' },
    { id: 'S002', name: '恒达机械设备公司', contact: '李强', phone: '139-0000-2002', category: '机械设备' },
    { id: 'S003', name: '绿源环保材料厂', contact: '王芳', phone: '137-0000-3003', category: '环保材料' },
    { id: 'S004', name: '鑫盛化工有限公司', contact: '赵刚', phone: '136-0000-4004', category: '化工原料' },
    { id: 'S005', name: '博远信息技术公司', contact: '陈静', phone: '135-0000-5005', category: 'IT设备' },
    { id: 'S006', name: '万通物流装备公司', contact: '刘伟', phone: '133-0000-6006', category: '物流设备' },
    { id: 'S007', name: '金泰精密仪器厂', contact: '孙磊', phone: '132-0000-7007', category: '精密仪器' },
    { id: 'S008', name: '长虹办公用品公司', contact: '周敏', phone: '131-0000-8008', category: '办公用品' }
  ];

  const materials = [
    { id: 'M001', name: '高性能芯片', unit: '个', unitPrice: 285.00, category: '电子元器件' },
    { id: 'M002', name: '液压缸组件', unit: '套', unitPrice: 4200.00, category: '机械设备' },
    { id: 'M003', name: '环保过滤膜', unit: '卷', unitPrice: 680.00, category: '环保材料' },
    { id: 'M004', name: '工业乙醇', unit: '桶', unitPrice: 350.00, category: '化工原料' },
    { id: 'M005', name: '服务器主机', unit: '台', unitPrice: 15800.00, category: 'IT设备' },
    { id: 'M006', name: '电动叉车', unit: '辆', unitPrice: 68000.00, category: '物流设备' },
    { id: 'M007', name: '光谱分析仪', unit: '台', unitPrice: 125000.00, category: '精密仪器' },
    { id: 'M008', name: 'A4复印纸', unit: '箱', unitPrice: 128.00, category: '办公用品' },
    { id: 'M009', name: '电阻电容套件', unit: '包', unitPrice: 56.00, category: '电子元器件' },
    { id: 'M010', name: '轴承组件', unit: '套', unitPrice: 890.00, category: '机械设备' },
    { id: 'M011', name: '碳纤维板材', unit: '张', unitPrice: 2400.00, category: '环保材料' },
    { id: 'M012', name: '网络交换机', unit: '台', unitPrice: 8600.00, category: 'IT设备' }
  ];

  let orderCounter = 1000;

  function generateOrderId() {
    orderCounter++;
    return `PO-2026-${String(orderCounter).padStart(4, '0')}`;
  }

  function generateInitialOrders() {
    const statuses = ['draft', 'pending', 'approved', 'purchasing', 'completed', 'rejected'];
    const orders = [
      {
        id: 'PO-2026-1001',
        supplierId: 'S001',
        items: [
          { materialId: 'M001', quantity: 500, unitPrice: 285.00 },
          { materialId: 'M009', quantity: 200, unitPrice: 56.00 }
        ],
        status: 'approved',
        remark: '紧急采购，用于新产品线',
        createdAt: '2026-05-20',
        updatedAt: '2026-05-22'
      },
      {
        id: 'PO-2026-1002',
        supplierId: 'S002',
        items: [
          { materialId: 'M002', quantity: 10, unitPrice: 4200.00 },
          { materialId: 'M010', quantity: 30, unitPrice: 890.00 }
        ],
        status: 'pending',
        remark: '生产线设备维护需求',
        createdAt: '2026-05-25',
        updatedAt: '2026-05-25'
      },
      {
        id: 'PO-2026-1003',
        supplierId: 'S005',
        items: [
          { materialId: 'M005', quantity: 3, unitPrice: 15800.00 },
          { materialId: 'M012', quantity: 5, unitPrice: 8600.00 }
        ],
        status: 'purchasing',
        remark: '数据中心扩容项目',
        createdAt: '2026-05-18',
        updatedAt: '2026-05-28'
      },
      {
        id: 'PO-2026-1004',
        supplierId: 'S003',
        items: [
          { materialId: 'M003', quantity: 50, unitPrice: 680.00 },
          { materialId: 'M011', quantity: 8, unitPrice: 2400.00 }
        ],
        status: 'draft',
        remark: '环保项目材料储备',
        createdAt: '2026-06-01',
        updatedAt: '2026-06-01'
      },
      {
        id: 'PO-2026-1005',
        supplierId: 'S007',
        items: [
          { materialId: 'M007', quantity: 1, unitPrice: 125000.00 }
        ],
        status: 'completed',
        remark: '实验室设备更新',
        createdAt: '2026-04-10',
        updatedAt: '2026-05-15'
      },
      {
        id: 'PO-2026-1006',
        supplierId: 'S004',
        items: [
          { materialId: 'M004', quantity: 100, unitPrice: 350.00 }
        ],
        status: 'rejected',
        remark: '原料价格波动，暂缓采购',
        createdAt: '2026-05-12',
        updatedAt: '2026-05-14'
      },
      {
        id: 'PO-2026-1007',
        supplierId: 'S008',
        items: [
          { materialId: 'M008', quantity: 200, unitPrice: 128.00 }
        ],
        status: 'pending',
        remark: '季度办公用品采购',
        createdAt: '2026-06-02',
        updatedAt: '2026-06-02'
      },
      {
        id: 'PO-2026-1008',
        supplierId: 'S006',
        items: [
          { materialId: 'M006', quantity: 2, unitPrice: 68000.00 }
        ],
        status: 'approved',
        remark: '仓储中心设备升级',
        createdAt: '2026-05-28',
        updatedAt: '2026-06-01'
      }
    ];
    return orders;
  }

  function getSupplier(id) {
    return suppliers.find(s => s.id === id);
  }

  function getMaterial(id) {
    return materials.find(m => m.id === id);
  }

  function getMaterialsByCategory(category) {
    return materials.filter(m => m.category === category);
  }

  function calcOrderTotal(items) {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  return {
    suppliers,
    materials,
    generateOrderId,
    generateInitialOrders,
    getSupplier,
    getMaterial,
    getMaterialsByCategory,
    calcOrderTotal
  };
})();
