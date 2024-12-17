const App = {
    init: async function () {
        try {
            // 连接到IPFS守护进程API服务器
            window.ipfs = window.IpfsApi('localhost', '5001');

            // 检查是否存在注入的web3实例
            if (typeof web3 !== 'undefined') {
                window.web3 = new Web3(web3.currentProvider);
            } else {
                window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
            }

            // 等待合约初始化
            await App.initContract();
            
            // 获取账户
            const accounts = await web3.eth.getAccounts();
            window.currentAccount = accounts[0];

            // 初始化表单验证
            App.initFormValidation();
            
        } catch (error) {
            console.error("初始化错误:", error);
        }
    },

    initContract: function () {
        return new Promise((resolve, reject) => {
            $.getJSON('/contracts/Car.json', function (data) {
                window.car = TruffleContract(data);
                window.car.setProvider(web3.currentProvider);
                window.car.deployed().then(instance => {
                    window.carInstance = instance;
                    resolve();
                }).catch(error => {
                    console.error("合约部署错误:", error);
                    reject(error);
                });
            }).fail(function(error) {
                console.error("无法加载合约 JSON:", error);
                reject(error);
            });
        });
    },

    initFormValidation: function() {
        // 表单验证规则
        $("#form").validate({
            rules: {
                nameWriter: {
                    required: true,
                    minlength: 2,
                    maxlength: 50
                },
                style: {
                    required: true
                },
                publisherPublishAge: {
                    required: true,
                    minlength: 2,
                    maxlength: 50
                },
                carNumber: {
                    required: true,
                    pattern: new RegExp('^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领]{1}[A-Z]{1}[A-Z0-9]{4,5}$')
                },
                pages: {
                    required: true,
                    min: 1990,
                    max: 2024,
                    digits: true
                },
                status: {
                    required: true
                },
                intro: {
                    required: true,
                    minlength: 10,
                    maxlength: 1000
                }
            },
            messages: {
                nameWriter: {
                    required: "请输入车辆名称",
                    minlength: "名称至少2个字符",
                    maxlength: "名称不能超过50个字符"
                },
                style: {
                    required: "请选择车辆类型"
                },
                publisherPublishAge: {
                    required: "请输入车主姓名",
                    minlength: "姓名至少2个字符",
                    maxlength: "姓名不能超过50个字符"
                },
                carNumber: {
                    required: "请输入车牌号",
                    pattern: "请输入正确的车牌号格式，如：粤B12345"
                },
                pages: {
                    required: "请输入购车年份",
                    min: "年份不能早于1990年",
                    max: "年份不能超过2024年",
                    digits: "请输入有效的年份"
                },
                status: {
                    required: "请选择出租状态"
                },
                intro: {
                    required: "请输入车辆简介",
                    minlength: "简介至少10个字符",
                    maxlength: "简介不能超过1000个字符"
                }
            },
            errorElement: 'span',
            errorClass: 'error',
            errorPlacement: function(error, element) {
                error.insertAfter(element);
            },
            submitHandler: function(form) {
                App.publish();
                return false;
            }
        });

        // 添加自定义验证方法
        $.validator.addMethod("pattern", function(value, element, regexp) {
            if (regexp.constructor != RegExp)
                regexp = new RegExp(regexp);
            return this.optional(element) || regexp.test(value);
        }, "请输入正确的格式");
    },

    // 发布车辆信息
    publish: async function () {
        try {
            if (!$("#form").valid()) {
                return;
            }

            $("#tip").html('<span style="color:blue">正在发布车辆信息...</span>');

            // 获取表单数据
            const formData = {
                nameWriter: $("#nameWriter").val().trim(),
                style: $("#style").val(),
                publisherPublishAge: $("#publisherPublishAge").val().trim(),
                carNumber: $("#carNumber").val().trim(),
                pages: $("#pages").val(),
                status: $("#status").val() || "未出租",
                intro: $("#intro").val().trim(),
                cover: $("#cover")[0].files[0]
            };

            // 验证必填字段
            if (!formData.cover) {
                throw new Error("请选择车辆图片");
            }

            // 处理图片上传
            const coverFile = $("#cover")[0].files[0];
            let coverHash = '';
            
            if (coverFile) {
                try {
                    
                    // 直接上传文件到 IPFS，无需转换为 buffer
                    const result = await App._ipfsCarAdd(coverFile);
                    coverHash = `http://localhost:8080/ipfs/${result}`;
                    console.log('图片已上传到 IPFS:', coverHash);
                    
                    $("#tip_cover").html('<span style="color:green">图片上传成功</span>');
                    $("#tip_cover").attr('href', coverHash);
                } catch (error) {
                    console.error('图片上传失败:', error);
                    $("#tip_cover").html('<span style="color:red">图片上传失败，将使用默认图片</span>');
                    coverHash = 'images/default-car.jpg';
                }
            } else {
                coverHash = 'images/default-car.jpg';
            }

            // 发布到区块链
            $("#tip").html('<span style="color:blue">正在发布车辆信息...</span>');
            await App.handleCarPublish(formData, coverHash);

            // 发布成功
            $("#tip").html('<span style="color:green">发布成功！</span>');
            alert("发布成功！等待区块确认...");
            
            // 延迟跳转
            setTimeout(() => {
                window.location.href = 'library/carHome.html';
            }, 1500);

        } catch (error) {
            console.error("发布失败:", error);
            $("#tip").html('<span style="color:red">发布失败: ' + error.message + '</span>');
        }
    },

    handleCarPublish: async function (formData, coverUrl) {
        try {
            const carInstance = await window.car.deployed();
            const result = await carInstance.publishCarInfo(
                formData.nameWriter,
                formData.style,
                formData.publisherPublishAge,
                formData.carNumber,
                formData.intro,
                coverUrl,
                formData.status,
                formData.pages,
                {
                    from: window.currentAccount,
                    gas: 3000000
                }
            );

            console.log('发布交易成功:', result);
            return result;
        } catch (error) {
            console.error('区块链交易失败:', error);
            throw error;
        }
    },

    // 修改 IPFS 上传方法
    _ipfsCarAdd: function (file) {
        return new Promise((resolve, reject) => {
            if (file.size > 5242880) {
                reject(new Error("图片大小不能超过5MB"));
                return;
            }

            // 创建 FormData 对象
            const formData = new FormData();
            formData.append('file', file);

            // 使用 fetch API 直接发送到 IPFS API
            fetch('http://localhost:5001/api/v0/add', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                if (result && result.Hash) {
                    resolve(result.Hash);
                } else {
                    reject(new Error("IPFS上传返回格式错误"));
                }
            })
            .catch(err => {
                reject(new Error("IPFS上传失败: " + err.message));
            });
        });
    }
};

// 页面加载完成后执行
$(function () {
    App.init();
    $("#publishCar-menu").addClass("menu-item-active");

    // 图片预览功能
    $("#cover").change(function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $("#preview").attr('src', e.target.result).show();
            };
            reader.readAsDataURL(file);
        }
    });

    // 字数限制
    $("#intro").on('input', function() {
        const maxLength = 1000;
        const remaining = maxLength - $(this).val().length;
        const $error = $(this).next('.error');
        
        if (remaining >= 0) {
            $error.text(`还可以输入${remaining}个字符`);
        } else {
            $(this).val($(this).val().substring(0, maxLength));
            $error.text('已达到最大字符数');
        }
    });
});
