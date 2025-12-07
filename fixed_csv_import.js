// CSV导入功能修复版本
class FixedCSVImporter {
    constructor() {
        console.log('🔧 FixedCSVImporter 初始化');
        this.students = [];
        this.init();
    }

    init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        console.log('🔧 开始设置事件监听器');

        // 查找CSV文件输入
        const csvInput = document.getElementById('csvFile');
        console.log('📁 CSV输入元素:', csvInput);

        if (!csvInput) {
            console.error('❌ 未找到csvFile元素');
            this.showMessage('错误：未找到文件输入元素', 'error');
            return;
        }

        // 添加文件选择事件监听器
        csvInput.addEventListener('change', (event) => {
            console.log('📁 文件选择事件:', event);
            this.handleFileSelect(event);
        });

        console.log('✅ CSV导入事件监听器已设置');
        this.showMessage('CSV导入功能已准备就绪', 'success');
    }

    handleFileSelect(event) {
        const files = event.target.files;
        console.log('📁 文件列表:', files);

        if (!files || files.length === 0) {
            console.log('❌ 没有选择文件');
            this.showMessage('请选择CSV文件', 'warning');
            return;
        }

        const file = files[0];
        console.log('📄 选择的文件:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        // 验证文件类型
        if (!file.name.toLowerCase().endsWith('.csv')) {
            console.log('❌ 文件类型错误');
            this.showMessage('请选择CSV格式文件', 'error');
            return;
        }

        this.processCSVFile(file);
    }

    processCSVFile(file) {
        console.log('📖 开始读取文件...');
        this.showMessage('正在读取文件...', 'info');

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                console.log('✅ 文件读取成功');
                const csvContent = event.target.result;
                console.log('📊 文件内容长度:', csvContent.length);

                this.parseCSV(csvContent);

            } catch (error) {
                console.error('❌ 文件处理错误:', error);
                this.showMessage('文件处理失败: ' + error.message, 'error');
            }
        };

        reader.onerror = (error) => {
            console.error('❌ 文件读取错误:', error);
            this.showMessage('文件读取失败', 'error');
        };

        reader.readAsText(file);
    }

    parseCSV(csvContent) {
        console.log('🔍 开始解析CSV...');

        try {
            // 分割行并过滤空行
            const lines = csvContent.split('\n');
            const validLines = lines.filter(line => line.trim().length > 0);

            console.log('📈 原始行数:', lines.length);
            console.log('📊 有效行数:', validLines.length);

            if (validLines.length === 0) {
                console.log('❌ 没有有效数据');
                this.showMessage('CSV文件没有有效内容', 'error');
                return;
            }

            // 解析学生姓名
            this.students = [];
            validLines.forEach((line, index) => {
                const name = line.trim().replace(/['"]/g, '');
                if (name) {
                    this.students.push({
                        id: Date.now() + index,
                        name: name,
                        rollCount: 0,
                        presentCount: 0,
                        lateCount: 0,
                        absentCount: 0,
                        lastRollTime: null
                    });
                }
            });

            console.log('✅ 解析完成，学生数量:', this.students.length);
            console.log('👥 学生列表:', this.students.map(s => s.name));

            if (this.students.length === 0) {
                this.showMessage('没有找到有效的学生姓名', 'warning');
                return;
            }

            this.saveToStorage();
            this.updateUI();
            this.showMessage(`✅ 成功导入 ${this.students.length} 名学生`, 'success');

        } catch (error) {
            console.error('❌ CSV解析错误:', error);
            this.showMessage('CSV解析失败: ' + error.message, 'error');
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('students', JSON.stringify(this.students));
            console.log('💾 数据已保存到localStorage');
        } catch (error) {
            console.error('❌ 保存失败:', error);
        }
    }

    updateUI() {
        try {
            // 更新学生数量显示
            const countElement = document.getElementById('studentCount');
            if (countElement) {
                countElement.textContent = this.students.length;
            }

            // 启用开始点名按钮
            const startButton = document.getElementById('startRoll');
            if (startButton) {
                startButton.disabled = false;
            }

            console.log('🎯 UI更新完成');
        } catch (error) {
            console.error('❌ UI更新失败:', error);
        }
    }

    showMessage(message, type = 'info') {
        console.log('💬 消息:', message, '(', type, ')');

        // 尝试显示在调试面板
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.innerHTML = message + '<br><small>' + new Date().toLocaleTimeString() + '</small>';
        }

        // 创建临时通知
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    getStudents() {
        return this.students;
    }
}

// 立即创建实例
window.csvImporter = new FixedCSVImporter();