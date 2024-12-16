App = {
    init: async function () {
        try {
            // Web3 初始化
            if (typeof window.ethereum !== 'undefined') {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                window.web3 = new Web3(window.ethereum);
            } else {
                window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
            }

            // IPFS 初始化
            try {
                window.ipfs = window.IpfsApi('localhost', '5001');
            } catch (ipfsError) {
                console.error('IPFS initialization failed:', ipfsError);
            }

            // 初始化合约
            await App.initContract();

            // 根据URL参数加载不同类型的车辆列表
            const type = getQueryVariable('type') || 'publish';
            switch(type) {
                case 'publish':
                    await App.getPublishedCars();
                    $("#rentCar-menu").addClass("menu-item-active");
                    break;
                case 'rented':
                    await App.getRentedCars();
                    $("#rentedCar-menu").addClass("menu-item-active");
                    break;
                case 'returned':
                    await App.getReturnedCars();
                    $("#returnedCar-menu").addClass("menu-item-active");
                    break;
                case 'commented':
                    await App.getCommentedCars();
                    $("#commentedCar-menu").addClass("menu-item-active");
                    break;
                default:
                    await App.getPublishedCars();
                    $("#rentCar-menu").addClass("menu-item-active");
            }

        } catch (error) {
            console.error("初始化失败:", error);
            if (error.message.includes('Contract has not been deployed')) {
                alert("智能合约未部署，请确保合约已正确部署到当前网络");
            } else if (error.message.includes('MetaMask')) {
                alert("请安装MetaMask插件并连接到正确的网络");
            } else {
                alert("系统初始化失败: " + error.message);
            }
        }
    },

    initContract: function () {
        return new Promise((resolve, reject) => {
            $.getJSON('/contracts/Car.json', function (data) {
                try {
                    window.car = TruffleContract(data);
                    window.car.setProvider(web3.currentProvider);
                    window.car.deployed().then(instance => {
                        window.carInstance = instance;
                        resolve();
                    }).catch(error => {
                        reject(error);
                    });
                } catch (error) {
                    reject(error);
                }
            }).fail(function(error) {
                reject(new Error("无法加载合约配置文件"));
            });
        });
    },

    // 获取已发布的车辆
    getPublishedCars: async function() {
        try {
            const carInstance = await car.deployed();
            const accounts = await web3.eth.getAccounts();
            const publishedCars = await carInstance.getPublishedCars({ from: accounts[0] });
            
            window.carsList = publishedCars;
            window.totalCarsNum = publishedCars.length;

            if (publishedCars.length === 0) {
                $("#Viewcars").html('<div class="alert alert-info">暂无发布的车辆</div>');
                return;
            }

            App.updatePagination();
        } catch (error) {
            console.error("获取已发布车辆失败:", error);
            $("#Viewcars").html('<div class="alert alert-danger">加载失败，请重试</div>');
        }
    },

    // 获取已租赁的车辆
    getRentedCars: async function() {
        try {
            const carInstance = await car.deployed();
            const accounts = await web3.eth.getAccounts();
            const rentedCars = await carInstance.getRentedCars({ from: accounts[0] });
            
            window.carsList = rentedCars;
            window.totalCarsNum = rentedCars.length;

            if (rentedCars.length === 0) {
                $("#Viewcars").html('<div class="alert alert-info">暂无租赁的车辆</div>');
                return;
            }

            App.updatePagination();
        } catch (error) {
            console.error("获取已租赁车辆失败:", error);
            $("#Viewcars").html('<div class="alert alert-danger">加载失败，请重试</div>');
        }
    },

    // 获取已归还的车辆
    getReturnedCars: async function() {
        try {
            const carInstance = await car.deployed();
            const accounts = await web3.eth.getAccounts();
            const returnedCars = await carInstance.getReturnedCars({ from: accounts[0] });
            
            window.carsList = returnedCars;
            window.totalCarsNum = returnedCars.length;

            if (returnedCars.length === 0) {
                $("#Viewcars").html('<div class="alert alert-info">暂无归还的车辆</div>');
                return;
            }

            App.updatePagination();
        } catch (error) {
            console.error("获取已归还车辆失败:", error);
            $("#Viewcars").html('<div class="alert alert-danger">加载失败，请重试</div>');
        }
    },

    // 获取已评价的车辆
    getCommentedCars: async function() {
        try {
            const carInstance = await car.deployed();
            const accounts = await web3.eth.getAccounts();
            const commentedCars = await carInstance.getCommentedCars({ from: accounts[0] });
            
            window.carsList = commentedCars;
            window.totalCarsNum = commentedCars.length;

            if (commentedCars.length === 0) {
                $("#Viewcars").html('<div class="alert alert-info">暂无评价的车辆</div>');
                return;
            }

            App.updatePagination();
        } catch (error) {
            console.error("获取已评价车辆失败:", error);
            $("#Viewcars").html('<div class="alert alert-danger">加载失败，请重试</div>');
        }
    },

    // 分页回调函数 - 展示车辆列表
    pageCallback: async function (index, jq) {
        try {
            $("#Viewcars").html('');
            const pageSize = 8;
            const start = index * pageSize;
            const end = Math.min((index + 1) * pageSize, totalCarsNum);
            
            const carsPromises = carsList.slice(start, end).map(async (carId) => {
                const result = await App._getCarInfo(carId);
                return `<div class="col-sm-6 col-md-3">
                    <div class="thumbnail">
                        <a href="car.html?id=${carId}">
                            <div style="position: relative;">
                                <img id="cover" class="img-cover" src="${result[6]}" alt="车辆图片"/>
                                <figcaption id="nameWriter" class="img-caption">${result[1]}</figcaption>
                            </div>
                        </a>
                        <div class="caption">
                            <span class="label label-info">评分</span>
                            <samp id="score">${result[10]}</samp>
                            <br/>
                            <span class="label label-info">类型</span>
                            <samp id="style">${result[2]}</samp>
                            <br/>
                            <span class="label label-info">车主信息</span>
                            <samp id="publisherPublishAge">${result[3]}</samp>
                            <br/>
                            <span class="label label-info">车牌号</span>
                            <samp id="carNumber">${result[4]}</samp>
                            <br/>
                            <span class="label label-info">购车年份</span>
                            <samp id="pages">${result[8]}</samp>
                            <br/>
                            <span class="label label-info">车辆状态</span>
                            <samp id="status">${result[7]}</samp>
                            <br/>
                            <span class="label label-info">车辆简介</span>
                            <samp id="intro">${result[5].substr(0, 20)}......</samp>
                            <br/>
                            ${result[7] === '已租赁' ? 
                                `<div align="center">
                                    <button class="btn btn-danger btn-xs" data-toggle="modal" data-target="#modal" 
                                            onclick="App.set(${carId})">还 车</button>
                                </div>` : ''}
                        </div>
                    </div>
                </div>`;
            });

            const content = await Promise.all(carsPromises);
            $("#Viewcars").append(content.join(''));
        } catch (error) {
            console.error("加载车辆列表失败:", error);
            $("#Viewcars").html('<div class="alert alert-danger">加载失败，请重试</div>');
        }
    },

    // 更新分页控件
    updatePagination: function() {
        $("#pagination").pagination(totalCarsNum, {
            callback: App.pageCallback,
            prev_text: '上一页',
            next_text: '下一页',
            items_per_page: 8,
            num_display_entries: 4,
            num_edge_entries: 1,
            current_page: 0
        });
    },

    // 合约调用方法
    _getCarInfo: function (id) {
        return new Promise(function (resolve, reject) {
            car.deployed().then(function (carInstance) {
                carInstance.getCarInfo.call(id).then(resolve).catch(reject);
            });
        });
    },

    // 获取车辆类型筛选
    getCarsByType: async function(type) {
        try {
            const carInstance = await car.deployed();
            const accounts = await web3.eth.getAccounts();
            let filteredCars = [];

            // 根据类型获取车辆
            if (type === 'rented') {
                filteredCars = await carInstance.getRentedCars({ from: accounts[0] });
            } else {
                const carsLength = await carInstance.getCarsLength();
                // 遍历所有车辆，筛选指定类型
                for (let i = 0; i < carsLength; i++) {
                    const carInfo = await App._getCarInfo(i);
                    if (carInfo[2] === type) { // carInfo[2] 是车辆类型
                        filteredCars.push(i);
                    }
                }
            }

            window.carsList = filteredCars;
            window.totalCarsNum = filteredCars.length;

            if (filteredCars.length === 0) {
                $("#Viewcars").html('<div class="alert alert-info">没有找到该类型的车辆</div>');
                return;
            }

            App.updatePagination();
        } catch (error) {
            console.error("筛选车辆失败:", error);
            $("#Viewcars").html('<div class="alert alert-danger">筛选失败，请重试</div>');
        }
    },

    // 搜索功能
    getCarsByKeyword: async function(keyword) {
        try {
            const carInstance = await car.deployed();
            const carsLength = await carInstance.getCarsLength();
            const filteredCars = [];
            
            for (let i = 0; i < carsLength; i++) {
                const carInfo = await App._getCarInfo(i);
                if (carInfo[1].includes(keyword) || // 名称
                    carInfo[2].includes(keyword) || // 类型
                    carInfo[3].includes(keyword) || // 车主
                    carInfo[4].includes(keyword) || // 车牌
                    carInfo[5].includes(keyword)) { // 简介
                    filteredCars.push(i);
                }
            }

            window.carsList = filteredCars;
            window.totalCarsNum = filteredCars.length;

            if (filteredCars.length === 0) {
                $("#Viewcars").html('<div class="alert alert-info">未找到匹配的车辆</div>');
                return;
            }

            App.updatePagination();
        } catch (error) {
            console.error("搜索车辆失败:", error);
            $("#Viewcars").html('<div class="alert alert-danger">搜索失败，请重试</div>');
        }
    }
};

// 获取URL参数的辅助函数
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return false;
}

// 初始化应用
$(function () {
    App.init();
});