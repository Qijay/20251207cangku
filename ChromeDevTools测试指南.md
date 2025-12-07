# Chrome DevTools 测试指南

## 🧪 测试环境准备

1. **打开系统**
   ```
   双击 "启动系统.bat" 或直接打开 index.html
   ```

2. **打开开发者工具**
   - 按 `F12` 或右键 → 检查
   - 切换到 **Console（控制台）** 标签页

## 🔍 功能测试步骤

### 1. 测试CSV导入功能
```javascript
// 在Console中执行，验证数据库初始化
indexedDB.open('RollCallDB').onsuccess = (e) => {
    console.log('✅ IndexedDB连接成功', e.target.result);
};
```

**手动测试：**
- 点击"📤 导入CSV名单"
- 选择"示例学生名单.csv"
- 检查是否显示"当前人数：29"

### 2. 测试点名功能
```javascript
// 检查学生数据是否正确加载
localStorage.getItem('students');
```

**手动测试：**
- 点击"🌍 开始点名"
- 观察3D地球旋转动画
- 查看点名结果和按钮状态变化

### 3. 测试智能加权算法
```javascript
// 模拟创建测试数据（在Console中执行）
const testStudents = [
    {name: '正常学生', lateCount: 0, absentCount: 0},
    {name: '迟到学生', lateCount: 2, absentCount: 0},
    {name: '缺席学生', lateCount: 0, absentCount: 2}
];

console.log('测试数据准备完成');
```

### 4. 测试数据导出
```javascript
// 检查导出功能
console.log('当前记录数量：', performance.memory?.usedJSHeapSize);
```

**手动测试：**
- 进行几次点名操作
- 设置日期范围
- 点击"📥 导出记录"
- 检查下载的CSV文件

### 5. 测试统计功能
```javascript
// 监听统计更新
let originalUpdate = window.rollCallSystem?.updateStatistics;
if (originalUpdate) {
    window.rollCallSystem.updateStatistics = function() {
        originalUpdate.call(this);
        console.log('📊 统计已更新', {
            总次数: document.getElementById('totalRolls').textContent,
            签到率: document.getElementById('attendanceRate').textContent,
            迟到率: document.getElementById('lateRate').textContent
        });
    };
}
```

## 🐛 常见问题排查

### 检查 IndexedDB 状态
```javascript
// 查看数据库结构
indexedDB.databases().then(dbs => console.log('数据库列表:', dbs));

// 检查存储的数据
const request = indexedDB.open('RollCallDB');
request.onsuccess = (e) => {
    const db = e.target.result;
    const transaction = db.transaction(['students', 'records'], 'readonly');

    // 检查学生数据
    const studentsStore = transaction.objectStore('students');
    studentsStore.getAll().onsuccess = (e) => {
        console.log('学生数据:', e.target.result);
    };

    // 检查记录数据
    const recordsStore = transaction.objectStore('records');
    recordsStore.getAll().onsuccess = (e) => {
        console.log('点名记录:', e.target.result);
    };
};
```

### 检查 localStorage 数据
```javascript
console.log('localStorage学生数据:', JSON.parse(localStorage.getItem('students') || 'null'));
```

### 验证动画效果
```javascript
// 检查CSS动画
const earth = document.querySelector('.earth');
if (earth) {
    const styles = window.getComputedStyle(earth);
    console.log('地球动画状态:', {
        transform: styles.transform,
        animation: styles.animation,
        'transform-style': styles['transform-style']
    });
}
```

## 📊 性能监控

```javascript
// 监控内存使用
setInterval(() => {
    if (performance.memory) {
        console.log('内存使用:', {
            已使用: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            总计: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
        });
    }
}, 10000);
```

## ✅ 预期测试结果

### 基本功能验证
- [x] CSV导入成功，显示29名学生
- [x] 点名动画流畅运行
- [x] 签到/迟到/缺席状态正确记录
- [x] 统计数据实时更新
- [x] 数据导出正常工作

### 高级功能验证
- [x] 迟到学生点名概率增加
- [x] 缺席学生点名概率增加
- [x] 时间范围筛选功能
- [x] 响应式设计适配
- [x] 数据持久化存储

### 动画效果验证
- [x] 3D地球持续旋转
- [x] 点名动画流畅
- [x] 按钮悬停效果
- [x] 通知弹出动画

## 🎯 测试完成确认

当以下条件都满足时，系统测试通过：

1. **无控制台错误** - Console中无红色错误信息
2. **功能正常响应** - 所有按钮点击都有反馈
3. **数据正确存储** - IndexedDB和localStorage都能正常读写
4. **动画效果流畅** - 无卡顿或延迟
5. **导出文件正确** - CSV文件格式和内容正确

## 📞 技术支持

如果测试中遇到问题：
1. 检查浏览器控制台错误信息
2. 验证IndexedDB是否支持（现代浏览器都支持）
3. 确认文件路径和权限正确
4. 尝试刷新页面重新初始化

---

**测试完成后，系统即可正式投入使用！** 🎉