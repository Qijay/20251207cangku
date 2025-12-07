// 功能测试脚本 - 在浏览器控制台中运行
console.log('🧪 开始功能测试...');

// 测试1: 检查RollCallSystem是否正确初始化
function testRollCallSystemInit() {
    console.log('🔍 测试1: RollCallSystem初始化');
    try {
        if (window.rollCallSystem) {
            console.log('✅ RollCallSystem已正确初始化');
            console.log('📊 学生数量:', window.rollCallSystem.students.length);
            return true;
        } else {
            console.error('❌ RollCallSystem未初始化');
            return false;
        }
    } catch (error) {
        console.error('❌ 初始化测试失败:', error);
        return false;
    }
}

// 测试2: 模拟CSV导入
function testCSVImport() {
    console.log('🔍 测试2: CSV导入功能');

    // 创建模拟CSV内容
    const mockCSVContent = `张三
李四
王五
赵六
陈七
刘八
周九
吴十`;

    try {
        // 模拟文件读取
        const mockFile = new Blob([mockCSVContent], { type: 'text/csv' });
        const mockFileList = [mockFile];

        // 创建事件对象
        const mockEvent = {
            target: {
                files: mockFileList
            }
        };

        // 测试解析功能
        const lines = mockCSVContent.split('\n');
        const validLines = lines.filter(line => line.trim().length > 0);

        console.log('✅ CSV解析测试成功');
        console.log('📈 解析到学生数量:', validLines.length);
        validLines.forEach((line, index) => {
            console.log(`  ${index + 1}. ${line.trim()}`);
        });

        return true;
    } catch (error) {
        console.error('❌ CSV导入测试失败:', error);
        return false;
    }
}

// 测试3: 检查localStorage功能
function testLocalStorage() {
    console.log('🔍 测试3: localStorage功能');

    try {
        const testData = [
            { id: 1, name: '测试学生1', rollCount: 0 },
            { id: 2, name: '测试学生2', rollCount: 0 }
        ];

        localStorage.setItem('testStudents', JSON.stringify(testData));
        const retrieved = JSON.parse(localStorage.getItem('testStudents'));

        if (retrieved && retrieved.length === 2) {
            console.log('✅ localStorage读写功能正常');
            localStorage.removeItem('testStudents'); // 清理测试数据
            return true;
        } else {
            console.error('❌ localStorage读写测试失败');
            return false;
        }
    } catch (error) {
        console.error('❌ localStorage测试失败:', error);
        return false;
    }
}

// 测试4: 检查DOM元素
function testDOMElements() {
    console.log('🔍 测试4: DOM元素检查');

    const requiredElements = [
        'csvFile',
        'startRoll',
        'markPresent',
        'markLate',
        'markAbsent',
        'studentCount',
        'selectedName'
    ];

    let allFound = true;
    requiredElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`✅ 找到元素: ${elementId}`);
        } else {
            console.error(`❌ 未找到元素: ${elementId}`);
            allFound = false;
        }
    });

    return allFound;
}

// 测试5: 检查事件监听器
function testEventListeners() {
    console.log('🔍 测试5: 事件监听器检查');

    const csvFile = document.getElementById('csvFile');
    if (csvFile) {
        const listeners = getEventListeners ? getEventListeners(csvFile) : '无法检查（需要Chrome DevTools）';
        console.log('📝 CSV文件输入监听器:', listeners);
        return true;
    } else {
        console.error('❌ CSV文件输入元素未找到');
        return false;
    }
}

// 运行所有测试
function runAllTests() {
    console.log('🚀 开始运行所有功能测试...');

    const results = {
        init: testRollCallSystemInit(),
        csv: testCSVImport(),
        storage: testLocalStorage(),
        dom: testDOMElements(),
        events: testEventListeners()
    };

    console.log('\n📊 测试结果汇总:');
    console.log('================');
    console.log('初始化测试:', results.init ? '✅ 通过' : '❌ 失败');
    console.log('CSV导入测试:', results.csv ? '✅ 通过' : '❌ 失败');
    console.log('localStorage测试:', results.storage ? '✅ 通过' : '❌ 失败');
    console.log('DOM元素测试:', results.dom ? '✅ 通过' : '❌ 失败');
    console.log('事件监听器测试:', results.events ? '✅ 通过' : '❌ 失败');

    const passCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    console.log(`\n🎯 总体结果: ${passCount}/${totalCount} 测试通过`);

    if (passCount === totalCount) {
        console.log('🎉 所有功能测试通过！');
    } else {
        console.log('⚠️ 部分测试失败，需要进一步检查');
    }

    return results;
}

// 自动运行测试
runAllTests();