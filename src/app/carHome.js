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
            var result = await App._getCarInfo(i);
            var rentNum = await App._getRentNums(i);
            
            var carHtml = template
                .replace('{nameWriter}', result[1])
                .replace('{rentNum}', rentNum)
                .replace('{score}', result[10])
                .replace('{style}', result[2])
                .replace('{publisherPublishAge}', result[3])
                .replace('{carNumber}', result[4])
                .replace('{pages}', result[8])
                .replace('{status}', result[7] ? '已出租' : '未出租')
                .replace('{id}', i.toString())
                .replace('{cover}', result[6] || 'images/default-car.jpg')
                .replace('{intro}', result[5]);
                
            content += carHtml;
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
            var result = searchList[i][1];
            var rentNum = await App._getRentNums(searchList[i][0]);
            
            var carHtml = template
                .replace('{nameWriter}', result[1])
                .replace('{rentNum}', rentNum)
                .replace('{score}', result[10])
                .replace('{style}', result[2])
                .replace('{publisherPublishAge}', result[3])
                .replace('{carNumber}', result[4])
                .replace('{pages}', result[8])
                .replace('{status}', result[7])
                .replace('{id}', searchList[i][0].toString())
                .replace('{cover}', result[6])
                .replace('{intro}', result[5]);
                
            content += carHtml;
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
            // ID可能是字符串形式，需要转换
            const carId = parseInt(id);
            if (isNaN(carId)) {
                throw new Error('无效的车辆ID');
            }
            window.RentId = carId;
            // 重置按钮状态
            $("#rentCarBtn").html('确认租赁');
            $("#rentCarBtn").attr("disabled", false);
        } catch (error) {
            console.error('设置租赁ID失败:', error);
            alert("设置租赁ID失败: " + error.message);
        }
    },

    // 处理车辆租赁
    rentCar: function() {
        try {
            // 检查 MetaMask
            if (typeof window.ethereum === 'undefined') {
                throw new Error('请安装 MetaMask');
            }

            // 获取合约实例
            car.deployed().then(function(carInstance) {
                // 检查车辆是否已出租
                carInstance.isCarRented.call(window.RentId).then(function(result) {
                    if (result) {
                        $("#rentCarBtn").html('已出租');
                        $("#rentCarBtn").attr("disabled", true);
                        alert("该车辆已被租出");
                        $("#modal").modal('hide');
                    } else {
                        // 检查是否是自己的车
                        carInstance.isMyCar.call(window.RentId).then(function(ismycar) {
                            if (ismycar) {
                                $("#rentCarBtn").html('无法租赁');
                                $("#rentCarBtn").attr("disabled", true);
                                alert("不能租赁自己的车辆!");
                                $("#modal").modal('hide');
                            } else {
                                // 获取当前账户
                                web3.eth.getAccounts().then(function(accounts) {
                                    if (!accounts || accounts.length === 0) {
                                        throw new Error('请先连接 MetaMask');
                                    }
                                    
                                    // 发送租赁交易
                                    carInstance.rentCar(window.RentId, {
                                        from: accounts[0],
                                        gas: 3000000
                                    }).then(function(result) {
                                        console.log('租赁交易已发送:', result);
                                        alert("租赁成功，等待区块确认!");
                                        $("#modal").modal('hide');
                                        window.location.reload();
                                    }).catch(function(error) {
                                        console.error('租赁失败:', error);
                                        if (error.message.includes('User denied')) {
                                            alert("您取消了交易");
                                        } else {
                                            alert("租赁失败: " + error.message);
                                        }
                                        $("#modal").modal('hide');
                                    });
                                }).catch(function(error) {
                                    console.error('获取账户失败:', error);
                                    alert("获取账户失败: " + error.message);
                                });
                            }
                        }).catch(function(error) {
                            console.error('检查车辆所有权失败:', error);
                            alert("检查车辆所有权失败: " + error.message);
                        });
                    }
                }).catch(function(error) {
                    console.error('检查车辆状态失败:', error);
                    alert("检查车辆状态失败: " + error.message);
                });
            }).catch(function(error) {
                console.error('获取合约实例失败:', error);
                alert("获取合约实例失败: " + error.message);
            });
        } catch (error) {
            console.error('租赁操作失败:', error);
            alert("租赁操作失败: " + error.message);
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