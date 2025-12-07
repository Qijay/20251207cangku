class RollCallSystem {
    constructor() {
        this.students = [];
        this.currentStudent = null;
        this.db = null;
        this.isRolling = false;

        // 点名历史记录
        this.rollHistory = [];
        this.currentHistoryIndex = -1;
        this.isAutoRolling = false;
        this.autoRollTimer = null;

        this.initializeDB();
        this.setupEventListeners();
        this.loadStudentsFromStorage();
        this.updateStatistics();
        this.loadRecentRecords();

        // 初始化按钮状态
        this.initializeButtonStates();
    }

    // 初始化IndexedDB
    initializeDB() {
        const request = indexedDB.open('RollCallDB', 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 创建学生表
            if (!db.objectStoreNames.contains('students')) {
                const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
                studentStore.createIndex('name', 'name', { unique: false });
            }

            // 创建记录表
            if (!db.objectStoreNames.contains('records')) {
                const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                recordStore.createIndex('studentId', 'studentId', { unique: false });
                recordStore.createIndex('timestamp', 'timestamp', { unique: false });
                recordStore.createIndex('status', 'status', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('数据库初始化成功');
        };

        request.onerror = (event) => {
            console.error('数据库初始化失败:', event.target.error);
        };
    }

    // 设置事件监听器
    setupEventListeners() {
        // CSV文件导入
        document.getElementById('csvFile').addEventListener('change', (e) => this.importCSV(e));

        // 点名控制按钮
        document.getElementById('startRoll').addEventListener('click', () => this.startRoll());
        document.getElementById('markPresent').addEventListener('click', () => this.markAttendance('present'));
        document.getElementById('markLate').addEventListener('click', () => this.markAttendance('late'));
        document.getElementById('markAbsent').addEventListener('click', () => this.markAttendance('absent'));
        document.getElementById('nextRoll').addEventListener('click', () => this.rollToNext());
        document.getElementById('previousRoll').addEventListener('click', () => this.rollToPrevious());
        document.getElementById('autoRoll').addEventListener('click', () => this.toggleAutoRoll());

        // 数据管理按钮
        document.getElementById('exportData').addEventListener('click', () => this.exportToCSV());
        document.getElementById('clearRecords').addEventListener('click', () => this.clearRecords());

        // 日期过滤器
        document.getElementById('startDate').addEventListener('change', () => this.loadRecentRecords());
        document.getElementById('endDate').addEventListener('change', () => this.loadRecentRecords());

        // 设置今天的日期作为默认值
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('endDate').value = today;

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        document.getElementById('startDate').value = lastMonth.toISOString().split('T')[0];
    }

    // 初始化按钮状态
    initializeButtonStates() {
        // 初始状态下，签到相关按钮和导航按钮都是禁用的
        document.getElementById('markPresent').disabled = true;
        document.getElementById('markLate').disabled = true;
        document.getElementById('markAbsent').disabled = true;
        document.getElementById('nextRoll').disabled = true;
        document.getElementById('previousRoll').disabled = true;
        document.getElementById('autoRoll').disabled = true;

        // 开始点名按钮根据是否有学生名单决定
        const hasStudents = this.students.length > 0;
        document.getElementById('startRoll').disabled = !hasStudents;
    }

    // 导入CSV文件
    importCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const lines = csv.split('\n').filter(line => line.trim());

            this.students = [];
            lines.forEach((line, index) => {
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

            this.saveStudentsToStorage();
            this.saveStudentsToDB();
            this.updateStudentCount();

            // 更新按钮状态
            document.getElementById('startRoll').disabled = false;
            this.showNotification(`成功导入 ${this.students.length} 名学生`, 'success');
        };
        reader.readAsText(file);
    }

    // 保存学生到localStorage
    saveStudentsToStorage() {
        localStorage.setItem('students', JSON.stringify(this.students));
    }

    // 从localStorage加载学生
    loadStudentsFromStorage() {
        const stored = localStorage.getItem('students');
        if (stored) {
            this.students = JSON.parse(stored);
            this.updateStudentCount();
        }
    }

    // 保存学生到IndexedDB
    saveStudentsToDB() {
        if (!this.db) return;

        const transaction = this.db.transaction(['students'], 'readwrite');
        const store = transaction.objectStore('students');

        // 清空现有数据
        store.clear();

        // 添加新数据
        this.students.forEach(student => {
            store.add(student);
        });
    }

    // 开始点名
    startRoll() {
        if (this.students.length === 0) {
            this.showNotification('请先导入学生名单', 'warning');
            return;
        }

        if (this.isRolling) return;

        this.isRolling = true;
        document.getElementById('startRoll').disabled = true;

        // 重置按钮状态
        document.getElementById('markPresent').disabled = true;
        document.getElementById('markLate').disabled = true;
        document.getElementById('markAbsent').disabled = true;
        document.getElementById('nextRoll').disabled = true;
        document.getElementById('previousRoll').disabled = true;
        document.getElementById('autoRoll').disabled = true;

        // 显示点名提示
        this.showNotification('正在选择学生...', 'info');

        // 计算加权概率
        const weightedStudents = this.calculateWeightedProbabilities();

        // 延迟一点时间让用户看到提示，然后直接显示最终结果
        setTimeout(() => {
            const finalStudent = this.selectWeightedStudent(weightedStudents);
            this.showStudent(finalStudent, false, true); // 直接显示最终结果

            this.isRolling = false;
            document.getElementById('startRoll').disabled = false;
        }, 800); // 800ms的短暂延迟
    }

    // 计算加权概率
    calculateWeightedProbabilities() {
        return this.students.map(student => {
            let weight = 1.0;

            // 迟到学生权重增加
            if (student.lateCount > 0) {
                weight += student.lateCount * 0.5;
            }

            // 缺席学生权重增加
            if (student.absentCount > 0) {
                weight += student.absentCount * 0.3;
            }

            // 最近未被点名的学生权重增加
            if (student.lastRollTime) {
                const daysSinceLastRoll = (Date.now() - student.lastRollTime) / (1000 * 60 * 60 * 24);
                weight += Math.min(daysSinceLastRoll * 0.1, 1.0);
            } else {
                weight += 0.5; // 从未被点名的新学生
            }

            return {
                ...student,
                weight: weight
            };
        });
    }

    // 根据权重选择学生
    selectWeightedStudent(weightedStudents) {
        const totalWeight = weightedStudents.reduce((sum, student) => sum + student.weight, 0);
        let random = Math.random() * totalWeight;

        for (const student of weightedStudents) {
            random -= student.weight;
            if (random <= 0) {
                return student;
            }
        }

        return weightedStudents[0];
    }

    // 显示学生姓名
    showStudent(student, isAnimation = false, isFinal = false) {
        this.currentStudent = student;

        // 如果是最终显示（不是动画），则添加到历史记录
        if (!isAnimation) {
            this.addToHistory(student);
        }
        const namePlate = document.getElementById('namePlate');
        const selectedName = document.getElementById('selectedName');
        const statusBadge = document.getElementById('statusBadge');

        selectedName.textContent = student.name;
        statusBadge.className = 'status-badge';
        statusBadge.textContent = '';

        namePlate.classList.remove('show');

        if (isAnimation) {
            // 动画效果 - 快速切换
            setTimeout(() => {
                namePlate.classList.add('show');
            }, 10);
        } else if (isFinal) {
            // 最终显示 - 有足够时间让用户看清
            setTimeout(() => {
                namePlate.classList.add('show');

                // 添加明显的视觉提示
                namePlate.style.boxShadow = '0 20px 40px rgba(76, 175, 80, 0.3)';
                namePlate.style.border = '2px solid #4CAF50';

                // 延迟启用按钮，确保用户能看清最终结果
                setTimeout(() => {
                    // 启用签到按钮
                    document.getElementById('markPresent').disabled = false;
                    document.getElementById('markLate').disabled = false;
                    document.getElementById('markAbsent').disabled = false;

                    // 显示提示
                    this.showNotification(`请为 ${student.name} 选择出勤状态`, 'info');
                }, 500);
            }, 200);
        } else {
            // 普通显示
            setTimeout(() => {
                namePlate.classList.add('show');
                // 启用签到按钮
                document.getElementById('markPresent').disabled = false;
                document.getElementById('markLate').disabled = false;
                document.getElementById('markAbsent').disabled = false;
            }, 100);
        }
    }

    // 标记出勤状态
    markAttendance(status) {
        if (!this.currentStudent) return;

        const record = {
            studentId: this.currentStudent.id,
            studentName: this.currentStudent.name,
            status: status,
            timestamp: Date.now()
        };

        // 保存到数据库
        this.saveRecord(record);

        // 更新学生统计
        const student = this.students.find(s => s.id === this.currentStudent.id);
        if (student) {
            student.rollCount++;
            student.lastRollTime = Date.now();

            switch (status) {
                case 'present':
                    student.presentCount++;
                    break;
                case 'late':
                    student.lateCount++;
                    break;
                case 'absent':
                    student.absentCount++;
                    break;
            }

            this.saveStudentsToStorage();
        }

        // 显示状态标签
        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = this.getStatusText(status);
        statusBadge.className = `status-badge ${status}`;

        // 重置姓名板样式
        const namePlate = document.getElementById('namePlate');
        namePlate.style.boxShadow = '';
        namePlate.style.border = '';

        // 禁用签到按钮
        document.getElementById('markPresent').disabled = true;
        document.getElementById('markLate').disabled = true;
        document.getElementById('markAbsent').disabled = true;

        // 启用"下一位"按钮和"开始点名"按钮
        document.getElementById('nextRoll').disabled = false;
        document.getElementById('startRoll').disabled = false;

        // 更新统计信息
        this.updateStatistics();
        this.loadRecentRecords();

        this.showNotification(`${this.currentStudent.name} 已标记为${this.getStatusText(status)}，可以点击"下一位"继续点名`, 'success');
    }

    // 获取状态文本
    getStatusText(status) {
        const statusMap = {
            'present': '✅ 签到',
            'late': '⏰ 迟到',
            'absent': '❌ 缺席'
        };
        return statusMap[status] || status;
    }

    // 保存记录到数据库
    saveRecord(record) {
        if (!this.db) return;

        const transaction = this.db.transaction(['records'], 'readwrite');
        const store = transaction.objectStore('records');
        store.add(record);
    }

    // 更新统计信息
    updateStatistics() {
        const totalRolls = this.students.reduce((sum, student) => sum + student.rollCount, 0);
        const totalPresents = this.students.reduce((sum, student) => sum + student.presentCount, 0);
        const totalLates = this.students.reduce((sum, student) => sum + student.lateCount, 0);

        document.getElementById('totalRolls').textContent = totalRolls;
        document.getElementById('attendanceRate').textContent = totalRolls > 0 ?
            Math.round((totalPresents / totalRolls) * 100) + '%' : '0%';
        document.getElementById('lateRate').textContent = totalRolls > 0 ?
            Math.round((totalLates / totalRolls) * 100) + '%' : '0%';
    }

    // 加载最近记录
    loadRecentRecords() {
        if (!this.db) return;

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const transaction = this.db.transaction(['records'], 'readonly');
        const store = transaction.objectStore('records');
        const request = store.getAll();

        request.onsuccess = (event) => {
            let records = event.target.result;

            // 按日期过滤
            if (startDate && endDate) {
                const startTime = new Date(startDate).getTime();
                const endTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;

                records = records.filter(record =>
                    record.timestamp >= startTime && record.timestamp <= endTime
                );
            }

            // 按时间倒序排列
            records.sort((a, b) => b.timestamp - a.timestamp);

            this.displayRecords(records.slice(0, 10)); // 只显示最近10条
        };
    }

    // 显示记录
    displayRecords(records) {
        const recordsList = document.getElementById('recordsList');

        if (records.length === 0) {
            recordsList.innerHTML = '<div class="no-records">暂无记录</div>';
            return;
        }

        recordsList.innerHTML = records.map(record => `
            <div class="record-item ${record.status}">
                <div>
                    <div class="record-name">${record.studentName}</div>
                    <div class="record-time">${new Date(record.timestamp).toLocaleString()}</div>
                </div>
                <div class="record-status">${this.getStatusText(record.status)}</div>
            </div>
        `).join('');
    }

    // 导出CSV
    exportToCSV() {
        if (!this.db) return;

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const transaction = this.db.transaction(['records'], 'readonly');
        const store = transaction.objectStore('records');
        const request = store.getAll();

        request.onsuccess = (event) => {
            let records = event.target.result;

            // 按日期过滤
            if (startDate && endDate) {
                const startTime = new Date(startDate).getTime();
                const endTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;

                records = records.filter(record =>
                    record.timestamp >= startTime && record.timestamp <= endTime
                );
            }

            if (records.length === 0) {
                this.showNotification('没有可导出的记录', 'warning');
                return;
            }

            // 生成CSV内容
            const csvContent = this.generateCSV(records);

            // 下载文件
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `点名记录_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification(`成功导出 ${records.length} 条记录`, 'success');
        };
    }

    // 生成CSV内容
    generateCSV(records) {
        let csv = '学生姓名,状态,时间\n';

        records.forEach(record => {
            const statusText = this.getStatusText(record.status).replace(/[✅⏰❌]/g, '').trim();
            const time = new Date(record.timestamp).toLocaleString();
            csv += `"${record.studentName}","${statusText}","${time}"\n`;
        });

        return csv;
    }

    // 清空记录
    clearRecords() {
        if (!confirm('确定要清空所有记录吗？此操作不可恢复。')) return;

        if (!this.db) return;

        const transaction = this.db.transaction(['records'], 'readwrite');
        const store = transaction.objectStore('records');
        store.clear();

        // 重置学生统计
        this.students.forEach(student => {
            student.rollCount = 0;
            student.presentCount = 0;
            student.lateCount = 0;
            student.absentCount = 0;
            student.lastRollTime = null;
        });

        this.saveStudentsToStorage();
        this.updateStatistics();
        this.loadRecentRecords();

        this.showNotification('所有记录已清空', 'success');
    }

    // 更新学生数量显示
    updateStudentCount() {
        document.getElementById('studentCount').textContent = this.students.length;
    }

    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // 设置颜色
        const colors = {
            'success': '#4caf50',
            'warning': '#ff9800',
            'error': '#f44336',
            'info': '#2196f3'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // 添加到页面
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// 初始化系统
  // 添加到历史记录
    addToHistory(student) {
        // 如果不是当前显示的学生，则添加到历史记录
        if (!this.currentHistoryIndex || this.rollHistory[this.currentHistoryIndex]?.id !== student.id) {
            // 如果当前不在历史记录的末尾，则截断后面的记录
            if (this.currentHistoryIndex < this.rollHistory.length - 1) {
                this.rollHistory = this.rollHistory.slice(0, this.currentHistoryIndex + 1);
            }

            // 添加新学生到历史记录
            this.rollHistory.push({
                ...student,
                timestamp: Date.now()
            });

            this.currentHistoryIndex = this.rollHistory.length - 1;
            this.updateNavigationButtons();
        }
    }

    // 上一位
    rollToPrevious() {
        if (this.currentHistoryIndex > 0) {
            this.currentHistoryIndex--;
            const previousStudent = this.rollHistory[this.currentHistoryIndex];
            this.showStudent(previousStudent, false, false);
            this.showNotification(`上一位：${previousStudent.name}`, 'info');
            this.updateNavigationButtons();
        }
    }

    // 下一位
    rollToNext() {
        if (this.currentHistoryIndex < this.rollHistory.length - 1) {
            this.currentHistoryIndex++;
            const nextStudent = this.rollHistory[this.currentHistoryIndex];
            this.showStudent(nextStudent, false, false);
            this.showNotification(`下一位：${nextStudent.name}`, 'info');
            this.updateNavigationButtons();
        } else {
            // 如果没有下一位记录，则开始新的点名
            this.startRoll();
        }
    }

    // 切换自动点名
    toggleAutoRoll() {
        if (this.isAutoRolling) {
            this.stopAutoRoll();
        } else {
            this.startAutoRoll();
        }
    }

    // 开始自动点名
    startAutoRoll() {
        if (this.students.length === 0) {
            this.showNotification('请先导入学生名单', 'warning');
            return;
        }

        this.isAutoRolling = true;
        document.getElementById('autoRoll').textContent = '🛑 停止自动';
        document.getElementById('autoRoll').classList.remove('btn-primary');
        document.getElementById('autoRoll').classList.add('btn-danger');

        this.showNotification('自动点名已开启', 'success');
        this.autoRollToNext();
    }

    // 停止自动点名
    stopAutoRoll() {
        this.isAutoRolling = false;
        if (this.autoRollTimer) {
            clearTimeout(this.autoRollTimer);
            this.autoRollTimer = null;
        }

        document.getElementById('autoRoll').textContent = '🤖 自动点名';
        document.getElementById('autoRoll').classList.remove('btn-danger');
        document.getElementById('autoRoll').classList.add('btn-primary');

        this.showNotification('自动点名已停止', 'info');
    }

    // 自动点名到下一位
    autoRollToNext() {
        if (!this.isAutoRolling) return;

        // 开始点名
        this.startRoll();

        // 3秒后自动跳转下一位
        this.autoRollTimer = setTimeout(() => {
            if (this.isAutoRolling) {
                this.autoRollToNext();
            }
        }, 3000);
    }

    // 更新导航按钮状态
    updateNavigationButtons() {
        const hasPrevious = this.currentHistoryIndex > 0;
        const hasNext = this.currentHistoryIndex < this.rollHistory.length - 1;
        const hasHistory = this.rollHistory.length > 0;

        // 更新按钮状态
        document.getElementById('previousRoll').disabled = !hasPrevious;
        document.getElementById('nextRoll').disabled = !hasNext && !this.students.length;
        document.getElementById('autoRoll').disabled = !this.students.length;

        // 如果没有历史记录，重置状态
        if (!hasHistory) {
            this.currentHistoryIndex = -1;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RollCallSystem();
});

// 防止页面刷新时丢失数据提醒
window.addEventListener('beforeunload', (e) => {
    const students = localStorage.getItem('students');
    if (students) {
        const studentData = JSON.parse(students);
        if (studentData.length > 0) {
            e.preventDefault();
            e.returnValue = '';
        }
    }
});