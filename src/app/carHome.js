App = {
    init: function () {
        if (typeof web3 !== 'undefined') {
            window.web3 = new Web3(web3.currentProvider);
        } else {
            window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
        }
        App.initContract();
    },

    initContract: function () {
        $.getJSON('/contracts/Car.json', function (data) {
            window.car = TruffleContract(data);
            window.car.setProvider(web3.currentProvider);
            App.getCars();
        });
    },

    getCars: async function() {
        try {
            const instance = await car.deployed();
            const length = await instance.getCarsLength.call();
            window.totalCarsNum = length.toNumber();
            
            $("#pagination").pagination(totalCarsNum, {
                callback: App.pageCallback,
                prev_text: '上一页',
                next_text: '下一页',
                items_per_page: 8,
                num_display_entries: 4,
                num_edge_entries: 1,
                current_page: 0
            });
        } catch(error) {
            console.error("获取车辆列表失败:", error);
        }
    },

    _getCarInfo: function(id) {
        return new Promise((resolve, reject) => {
            car.deployed().then(function(instance) {
                instance.getCarInfo.call(id).then(resolve).catch(reject);
            });
        });
    },

    _getRentNums: function(id) {
        return new Promise((resolve, reject) => {
            car.deployed().then(function(instance) {
                instance.getRentNums.call(id).then(resolve).catch(reject);
            });
        });
    },

    _getCarsLength: function() {
        return new Promise((resolve, reject) => {
            car.deployed().then(function(instance) {
                instance.getCarsLength.call().then(resolve).catch(reject);
            });
        });
    },

    pageCallback: async function (index, jq) {
        $("#cars").html('');
        var pageNum = 8;
        var start = index * pageNum; 
        var end = Math.min((index + 1) * pageNum, totalCarsNum);
        
        const response = await fetch('library/templates/car-item.html');
        const template = await response.text();
        
        var content = '';
        for (var i = start; i < end; i++) {
            try {
                const result = await App._getCarInfo(i);
                const rentNum = await App._getRentNums(i);
                
                // 检查车辆状态
                const isRented = await car.deployed().then(instance => {
                    return instance.isCarRented.call(i);
                });
                
                // 根据实际状态设置显示文本和按钮
                const status = isRented ? '已出租' : '未出租';
                const buttonHtml = isRented 
                    ? '<button class="btn btn-default btn-xs" disabled>已出租</button>'
                    : `<button class="btn btn-danger btn-xs" data-toggle="modal" data-target="#modal" onclick="App.set(${i})">租赁</button>`;
                
                var carHtml = template
                    .replace(/{id}/g, i.toString())
                    .replace('{nameWriter}', result[1])
                    .replace('{rentNum}', rentNum)
                    .replace('{score}', result[10])
                    .replace('{style}', result[2])
                    .replace('{publisherPublishAge}', result[3])
                    .replace('{carNumber}', result[4])
                    .replace('{pages}', result[8])
                    .replace('{status}', status)
                    .replace('{cover}', result[6] || 'images/default-car.jpg')
                    .replace('{intro}', result[5])
                    .replace(/<button.*租赁.*button>/, buttonHtml);  // 替换租赁按钮
                    
                content += carHtml;
            } catch (error) {
                console.error(`加载车辆 ${i} 信息失败:`, error);
                continue;
            }
        }
        $("#cars").append(content);
    },

    pageCallSearchback: async function (index, jq) {
        $("#cars").html('');
        var pageNum = 8;
        var start = index * pageNum;
        var end = Math.min((index + 1) * pageNum, totalCarsNum);
        
        const response = await fetch('library/templates/car-item.html');
        const template = await response.text();
        
        var content = '';
        for (var i = start; i < end; i++) {
            try {
                const result = searchList[i][1];
                const carId = searchList[i][0];
                const rentNum = await App._getRentNums(carId);
                
                // 检查车辆状态
                const isRented = await car.deployed().then(instance => {
                    return instance.isCarRented.call(carId);
                });
                
                // 根据实际状态设置显示文本和按钮
                const status = isRented ? '已出租' : '未出租';
                const buttonHtml = isRented 
                    ? '<button class="btn btn-default btn-xs" disabled>已出租</button>'
                    : `<button class="btn btn-danger btn-xs" data-toggle="modal" data-target="#modal" onclick="App.set(${carId})">租赁</button>`;
                
                var carHtml = template
                    .replace(/{id}/g, carId.toString())
                    .replace('{nameWriter}', result[1])
                    .replace('{rentNum}', rentNum)
                    .replace('{score}', result[10])
                    .replace('{style}', result[2])
                    .replace('{publisherPublishAge}', result[3])
                    .replace('{carNumber}', result[4])
                    .replace('{pages}', result[8])
                    .replace('{status}', status)
                    .replace('{cover}', result[6])
                    .replace('{intro}', result[5])
                    .replace(/<button.*租赁.*button>/, buttonHtml);  // 替换租赁按钮
                    
                content += carHtml;
            } catch (error) {
                console.error(`加载搜索结果 ${i} 信息失败:`, error);
                continue;
            }
        }
        $("#cars").append(content);
    },

    getHomeCarByKeyword: async function(keyword){
        var tempNum = await App._getCarsLength();
        var saleTempList = new Array();
        var start = 0;
        var newArray = new Array();
        for(var i = start;i<tempNum;i++){
            saleTempList[i] = new Array(2);
            var resultInfo = await App._getCarInfo(i);
            if(resultInfo[1].match(keyword)==null){
            }else {
                saleTempList[i][0]=i;
                saleTempList[i][1]=resultInfo;
                newArray.push(saleTempList[i]);
            }
        }
        window.searchList = newArray;
        window.totalCarsNum = newArray.length;
        $("#pagination").pagination(totalCarsNum, {
            callback: App.pageCallSearchback,
            prev_text: '<<<',
            next_text: '>>>',
            ellipse_text: '...',
            current_page: 0,
            items_per_page: 8,
            num_display_entries: 4,
            num_edge_entries: 1
        });
        if(newArray.length==0){
            alert("没有找到该车辆信息");
        }
    },

    // 根据车辆类型筛选
    getHomeCarByType: async function(type){
        $("#cars").html(''); // 清空现有列表
        var tempNum = await App._getCarsLength();
        var saleTempList = new Array();
        var newArray = new Array();
        
        // 遍历所有车辆并筛选
        for(var i = 0; i < tempNum; i++){
            var resultInfo = await App._getCarInfo(i);
            if(resultInfo[2] === type) {
                saleTempList.push({
                    id: i,
                    info: resultInfo
                });
                newArray.push(saleTempList[i]);
            }
        }
        
        window.searchList = newArray;
        window.totalCarsNum = newArray.length;
        
        // 更新分页
        $("#pagination").pagination(totalCarsNum, {
            callback: App.pageCallSearchback,
            prev_text: '<<<',
            next_text: '>>>',
            ellipse_text: '...',
            current_page: 0,
            items_per_page: 8,
            num_display_entries: 4,
            num_edge_entries: 1
        });
        
        if(newArray.length === 0){
            alert("未找到该类型的车辆");
        }
    },

    // 设置要租赁的车辆ID
    set: function(id) {
        try {
            // 确保 id 不为空
            if (id === undefined || id === null) {
                throw new Error('车辆ID不能为空');
            }
            
            // 设置全局租赁ID
            window.RentId = parseInt(id);
            
            // 重置按钮状态
            $("#rentCarBtn")
                .prop("disabled", false)
                .html('确认租赁')
                .removeClass('btn-default')
                .addClass('btn-primary');
            
            console.log('设置租赁ID成功:', window.RentId);
            
        } catch (error) {
            console.error('设置租赁ID失败:', error);
            alert("设置租赁ID失败: " + error.message);
        }
    },

    // 处理车辆租赁
    rentCar: async function() {
        try {
            // 检查 MetaMask
            if (typeof window.ethereum === 'undefined') {
                throw new Error('请安装 MetaMask');
            }

            // 检查租赁ID是否已设置
            if (typeof window.RentId === 'undefined' || window.RentId === null) {
                throw new Error('未选择要租赁的车辆');
            }

            // 禁用按钮，防止重复点击
            $("#rentCarBtn")
                .prop("disabled", true)
                .html('处理中...')
                .removeClass('btn-primary')
                .addClass('btn-default');

            // 获取当前账户
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('请先连接 MetaMask');
            }

            // 获取合约实例
            const carInstance = await car.deployed();

            // 检查车辆状态
            const carInfo = await carInstance.getCarInfo.call(window.RentId);
            if (!carInfo) {
                throw new Error('车辆不存在');
            }

            // 检查是否是自己的车
            const isMyCar = await carInstance.isMyCar.call(window.RentId, { from: accounts[0] });
            if (isMyCar) {
                throw new Error('不能租赁自己的车辆');
            }

            // 检查车辆是否已出租
            const isRented = await carInstance.isCarRented.call(window.RentId);
            if (isRented) {
                throw new Error('该车辆已被租出');
            }

            console.log('准备发送租赁交易:', {
                carId: window.RentId,
                from: accounts[0]
            });

            // 发送租赁交易
            const result = await carInstance.rentCar(window.RentId, {
                from: accounts[0],
                gas: 3000000
            });

            console.log('租赁交易结果:', result);
            alert("租赁成功！");
            $('#modal').modal('hide');
            window.location.reload();

        } catch (error) {
            console.error("租赁失败:", error);
            
            // 恢复按钮状态
            $("#rentCarBtn")
                .prop("disabled", false)
                .html('确认租赁')
                .removeClass('btn-default')
                .addClass('btn-primary');
            
            if (error.message.includes('User denied')) {
                alert("您取消了交易");
            } else if (error.message.includes('revert')) {
                // 解析智能合约的 revert 原因
                const reason = error.message.split('revert ')[1] || '未知原因';
                alert("租赁失败: " + reason);
            } else {
                alert("租赁失败，请重试: " + error.message);
            }
        }
    }
};

// 搜索功能
function homeSearch() {
    var searchKeyWord = document.getElementById("home-keyword").value;
    if(!searchKeyWord) {
        alert("请输入搜索关键词");
        return;
    }
    App.getHomeCarByKeyword(searchKeyWord);
}

// 搜索框回车事件
$('#home-keyword').bind('keydown',function(event){
    if(event.keyCode == "13") {
        homeSearch();
    }
});

// 车辆类型筛选事件
$('#car-type').change(function() {
    var selectedType = $(this).val();
    if(selectedType) {
        App.getHomeCarByType(selectedType);
    } else {
        App.getCars(); // 显示所有车辆
    }
});

// 初始化
$(function () {
    App.init();
    $("#carHome-menu").addClass("menu-item-active");
});