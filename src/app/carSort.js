App = {
    init: function () {
        // 检查web3环境
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
            // 默认显示租赁榜
            App.sortCarByRentNums();
        });
    },

    // 分页回调函数
    pageCallback: async function(index, jq) {
        try {
            $("#sortList").empty();
            const pageSize = 10;
            const start = index * pageSize;
            const end = Math.min((index + 1) * pageSize, totalNum);
            
            let content = '';
            for(let i = start; i < end; i++) {
                const id = sortList[i][0];
                const [carInfo, rentNum] = await Promise.all([
                    App._getCarInfo(id),
                    App._getRentNums(id)
                ]);
                
                content += `
                    <div class="row">
                        <div class="col-xs-1">${i + 1}</div>
                        <div class="col-xs-1" title="${carInfo[1]}">${truncateText(carInfo[1], 4)}</div>
                        <div class="col-xs-3">${carInfo[0]}</div>
                        <div class="col-xs-1">${fmtDate(carInfo[9].toString())}</div>
                        <div class="col-xs-1">${carInfo[2]}</div>
                        <div class="col-xs-2">${carInfo[4]}</div>
                        <div class="col-xs-1">${rentNum}</div>
                        <div class="col-xs-1">${carInfo[10]}</div>
                        <div class="col-xs-1">
                            <a href="car.html?id=${id}">
                                <img style="width: 50px;height: 50px;" src="${carInfo[6]}" alt="车辆图片"/>
                            </a>
                        </div>
                    </div>
                `;
            }
            $("#sortList").html(content);
        } catch (error) {
            console.error("加载列表失败:", error);
            alert("加载列表失败，请刷新页面重试");
        }
    },

    // 按评分排序
    sortCarByComments: async function() {
        try {
            $("#bg").hide();
            const totalCars = await App._getCarsLength();
            window.totalNum = totalCars;
            
            // 获取所有车辆评分
            const carScores = await Promise.all(
                Array.from({length: totalCars}, async (_, i) => {
                    const info = await App._getCarInfo(i);
                    return [i, Number(info[10])];
                })
            );
            
            // 按评分降序排序
            window.sortList = carScores.sort((a, b) => b[1] - a[1]);
            App.updatePagination();
            $("#scoreBtn").addClass('active').siblings().removeClass('active');
        } catch (error) {
            console.error("评分排序失败:", error);
            alert("排序失败，请重试");
        }
    },

    // 按租赁次数排序
    sortCarByRentNums: async function() {
        try {
            $("#bg").hide();
            const totalCars = await App._getCarsLength();
            window.totalNum = totalCars;
            
            // 获取所有车辆租赁次数
            const rentNums = await Promise.all(
                Array.from({length: totalCars}, async (_, i) => {
                    const rentNum = await App._getRentNums(i);
                    return [i, Number(rentNum)];
                })
            );
            
            // 按租赁次数降序排序
            window.sortList = rentNums.sort((a, b) => b[1] - a[1]);
            App.updatePagination();
            $("#rentBtn").addClass('active').siblings().removeClass('active');
        } catch (error) {
            console.error("租赁次数排序失败:", error);
            alert("排序失败，请重试");
        }
    },

    // 按发布日期排序
    sortCarByDate: async function() {
        try {
            $("#bg").hide();
            const totalCars = await App._getCarsLength();
            window.totalNum = totalCars;
            
            // 获取所有车辆发布日期
            const dates = await Promise.all(
                Array.from({length: totalCars}, async (_, i) => {
                    const info = await App._getCarInfo(i);
                    return [i, Number(info[9])];
                })
            );
            
            // 按发布日期降序排序
            window.sortList = dates.sort((a, b) => b[1] - a[1]);
            App.updatePagination();
            $("#dateBtn").addClass('active').siblings().removeClass('active');
        } catch (error) {
            console.error("日期排序失败:", error);
            alert("排序失败，请重试");
        }
    },

    // 更新分页控件
    updatePagination: function() {
        $("#pagination").pagination(totalNum, {
            callback: App.pageCallback,
            prev_text: '上一页',
            next_text: '下一页',
            ellipse_text: '...',
            current_page: 0,
            items_per_page: 10,
            num_display_entries: 4,
            num_edge_entries: 1
        });
    },

    // 合约调用方法
    _getCarInfo: function (id) {
        return new Promise((resolve, reject) => {
            car.deployed().then(carInstance => 
                carInstance.getCarInfo.call(id)
            ).then(resolve).catch(reject);
        });
    },

    _getCarsLength: function () {
        return new Promise((resolve, reject) => {
            car.deployed().then(carInstance => 
                carInstance.getCarsLength.call()
            ).then(resolve).catch(reject);
        });
    },

    _getRentNums: function (id) {
        return new Promise((resolve, reject) => {
            car.deployed().then(carInstance => 
                carInstance.getRentNums.call(id)
            ).then(resolve).catch(reject);
        });
    }
};

// 格式化日期
function fmtDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 添加文字截断函数
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

// 初始化
$(function () {
    App.init();
    $("#sort-menu").addClass("menu-item-active");
});