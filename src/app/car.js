var modal = document.querySelector("#modal");

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
                // 使用正确的 IPFS API 初始化方法
                window.ipfs = window.IpfsApi({
                    host: 'localhost',
                    port: 5001,
                    protocol: 'http'
                });
                console.log('IPFS initialized successfully');
            } catch (ipfsError) {
                console.error('IPFS initialization failed:', ipfsError);
                // IPFS 失败不影响其他功能
            }

            // 初始化合约
            await App.initContract();
            
            // 获取当前账户
            const accounts = await web3.eth.getAccounts();
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found! Please check MetaMask connection.');
            }
            window.currentAccount = accounts[0];

            // 加载车辆信息
            await App.getCars();

        } catch (error) {
            console.error("初始化失败:", error);
            if (error.message.includes('Contract has not been deployed')) {
                alert("智能合约未部署，请确保合约已正确部署到当前网络");
            } else if (error.message.includes('MetaMask')) {
                alert("请安装MetaMask插件并连接到正确的网络");
            } else if (error.message.includes('No accounts found')) {
                alert("未检测到账户，请确保已连接 MetaMask");
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
            }).fail(function (error) {
                reject(new Error("无法加载合约配置文件"));
            });
        });
    },
    //////////////////////////////////////////////////////////////////////////////////////

    getCars: async function () {
        try {
            window.gid = getQueryVariable('id');
            if(!gid) {
                alert("未找到车辆信息");
                window.location.href = 'library/carHome.html';
                return;
            }

            // 获取基本信息
            const result = await App._getCarInfo(gid);
            const rentNum = await App._getRentNums(gid);
            
            // 更新所有显示信息
            $("#nameWriter").text(result[1]);  // 车辆名称
            $("#style").text(result[2]);       // 车辆类型
            $("#publisherPublishAge").text(result[3]); // 车主
            $("#carNumber").text(result[4]);   // 车牌号
            $("#intro").text(result[5]);       // 简介
            $("#cover").attr('src', result[6] || 'images/default-car.jpg'); // 封面图片
            $("#status").text(result[7] ? '已出租' : '未出租'); // 出租状态
            $("#pages").text(result[8].toString()); // 购车年份
            $("#date").text(fmtCarDate(result[9].toString())); // 发布时间
            $("#score").text(result[10].toString()); // 评分
            $("#rentNums").text(rentNum.toString()); // 租赁次数
            $("#owner").text(result[0]); // 车主地址

            // 加载评价信息
            await App.loadComments(gid, result[0]);
            
        } catch(error) {
            console.error("加载车辆信息失败:", error);
            alert("加载车辆信息失败: " + error.message);
        }
    },

    // 加载评价信息
    loadComments: async function(gid, ownerAddress) {
        try {
            const commentLength = await App._getCarsCommentLength(gid);
            $("#cars_comments_cnt").html(commentLength.toString());

            let commentsContent = '';
            for (let i = 0; i < commentLength; i++) {
                try {
                    const comment = await App._getCarCommentInfo(gid, i);
                    if (!comment || !comment[0]) continue;

                    // 评分处理
                    const score = parseInt(comment[2].toString());
                    const normalizedScore = Math.min(Math.max(score, 0), 10);
                    
                    // 评论内容处理
                    const commentText = comment[3] || '无评价内容';

                    commentsContent += `
                        <div class="comment-item">
                            <div class="comment-header">
                                <div class="user-info">
                                    <img src="images/buyer.png" alt="用户头像">
                                    <span>用户 #${comment[0].toString()}</span>
                                </div>
                                <div class="rating-stars">
                                    <span class="score-text">${normalizedScore}分</span>
                                    <div class="stars">
                                        ${'<span class="star filled">★</span>'.repeat(normalizedScore)}
                                        ${'<span class="star">☆</span>'.repeat(10-normalizedScore)}
                                    </div>
                                </div>
                            </div>
                            <div class="comment-content">
                                <p>${commentText}</p>
                            </div>
                        </div>`;
                } catch (err) {
                    console.error(`加载第${i}条评价失败:`, err);
                    continue;
                }
            }
            
            $("#comments").html(commentsContent || '<p class="text-center">暂无评价</p>');
            
        } catch(error) {
            console.error("加载评价失败:", error);
            $("#comments").html('<div class="alert alert-danger">加载评价失败</div>');
        }
    },

    set: async function(id) {
        try {
            // 检查 MetaMask
            if (typeof window.ethereum === 'undefined') {
                throw new Error('请安装 MetaMask');
            }

            // 请求用户授权
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('请先连接 MetaMask');
            }

            // 确保 id 是数字类型
            window.evaluateId = parseInt(id);
            window.evaluateScore = 10; // 默认评分
            
            showModal();
            $("#starCarsBtn").html('确 认').attr("disabled", false);
            
            // 重置星星评分
            if ($.fn.raty) {
                $('#star').raty({
                    number: 10,
                    targetType: 'hint',
                    target: '#hint',
                    targetKeep: true,
                    targetText: '请选择评分',
                    hints: ['C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'SSS'],
                    click: function (score) {
                        window.evaluateScore = parseInt(score);
                    }
                });
            } else {
                throw new Error('评分插件未加载');
            }
        } catch (error) {
            console.error('评分初始化失败:', error);
            alert(error.message);
        }
    },

    /**
     * 评价车辆
     */
    carevaluate: async function () {
        try {
            // 检查 MetaMask 连接状态
            if (typeof window.ethereum === 'undefined') {
                throw new Error('请安装 MetaMask');
            }

            // 请求用户授权
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('请先连接 MetaMask');
            }

            // 获取评价内容
            const content = $("#content").val() || '对方很高冷,什么也没有说......';
            
            // 检查评价参数
            if (typeof window.evaluateId === 'undefined' || typeof window.evaluateScore === 'undefined') {
                throw new Error('评价信息不完整');
            }

            // 显示处理中状态
            $("#starCarsBtn").attr("disabled", true).html('处理中...');

            // 获取合约实例
            const carInstance = await car.deployed();

            // 使用 Promise 方式调用合约
            await carInstance.evaluate(
                window.evaluateId,  // ID
                window.evaluateScore, // 评分
                content,  // 评价内容
                {
                    from: accounts[0],
                    gas: 3000000
                }
            );

            alert("评价成功！");
            hideModal();
            window.location.reload();

        } catch (error) {
            console.error("评价失败:", error);
            $("#starCarsBtn").attr("disabled", false).html('确 认');
            
            if (error.message.includes('User denied')) {
                alert("您取消了交易");
            } else if (error.message.includes('MetaMask')) {
                alert("请确保 MetaMask 已连接");
            } else {
                alert("评价失败，请重试: " + error.message);
            }
            hideModal();
        }
    },

    ////////////////////////////////////////////////////////////

    /**
     * 获取车辆详细信息
     * @param id
     * @returns {Promise<any>}
     * @private
     */
    _getCarInfo: function (id) {
        return new Promise(function (resolve, reject) {
            car.deployed().then(function (carInstance) {
                carInstance.getCarInfo.call(id).then(function (result) {
                    resolve(result);
                }).catch(function (err) {
                    reject(err);
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    },

    _getCarCommentInfo: function (gid, cid) {
        return new Promise(function (resolve, reject) {
            car.deployed().then(function (carInstance) {
                carInstance.getCommentInfo.call(gid, cid).then(function (result) {
                    resolve(result);
                }).catch(function (err) {
                    console.error("获取评价信息失败:", err);
                    reject(err);
                });
            }).catch(function (err) {
                console.error("获取合约实例失败:", err);
                reject(err);
            });
        });
    },

    _getCarsCommentLength: function (id) {
        return new Promise(function (resolve, reject) {
            car.deployed().then(function (carInstance) {
                carInstance.getCommentLength.call(id).then(function (result) {
                    resolve(result);
                }).catch(function (err) {
                    console.error("获取评价数量失败:", err);
                    reject(err);
                });
            }).catch(function (err) {
                console.error("获取合约实例失败:", err);
                reject(err);
            });
        });
    },

    _getRentNums: function (id) {
        return new Promise(function (resolve,reject) {
            car.deployed().then(function (carInstance) {
                carInstance.getRentNums.call(id).then(function (result) {
                    resolve(result);
                }).catch(function (err) {
                    alert("内部错误" + err);
                })
            })
        })
    }
}

document.querySelector("#cancel").addEventListener("click", () => {
    hideModal();
});

function hideModal() {
    modal.style.display = 'none';
}

function showModal() {
    modal.style.display = 'block';
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return (false);
}

function fmtCarDate(timestamp) {
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return '无效时间';
        }
        
        const Y = date.getFullYear();
        const M = String(date.getMonth() + 1).padStart(2, '0');
        const D = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        
        return `${Y}-${M}-${D} ${h}:${m}:${s}`;
    } catch (error) {
        console.error('时间格式化错误:', error);
        return '时间格式错误';
    }
}

$(function () {
    App.init();
});