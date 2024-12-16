pragma solidity >=0.4.22 <0.6.0;
pragma experimental ABIEncoderV2;

contract Car {
    struct OptCar {
        uint[] publishedCars;    // 已发布的车辆
        uint[] rentedCars;       // 已租赁的车辆
        uint[] returnedCars;     // 已归还的车辆
        uint[] commentedCars;    // 已评价的车辆
    }

    struct Car {
        address owner;           // 车主地址
        string nameWriter;       // 车辆名称
        string style;           // 车辆类型
        string publisherPublishAge; // 车主姓名
        string carNumber;       // 车牌号
        string intro;           // 车辆简介
        string cover;           // 车辆图片

        string status;          // 车辆状态(未出租/已出租)
        uint pages;            // 购车年份
        uint publishDate;      // 发布时间
        uint score;            // 评分
        uint comment;          // 评论数量
        mapping(uint => Comment) comments;    // 评价列表
        mapping(uint => RentNums) rentNums;  // 租赁次数记录
    }

    struct Comment {
        address renter;        // 租车者
        uint date;            // 评价日期
        uint score;           // 评分
        string content;       // 评论内容
    }

    struct RentNums {
        uint rentNum;         // 租赁次数
    }

    Car[] cars;
    uint tempNum = 1;
    mapping(address => OptCar) CarsPool;

    // 事件定义
    event publishCarSuccess(uint id, string nameWriter, string style, string publisherPublishAge,
        string carNumber, string intro, string cover, uint pages, string status,
        uint publishDate);
    event evaluateSuccess(uint id, address addr, uint score);
    event rentSuccess(uint id, address addr);
    event returnCarSuccess(uint id, address addr);

    // 获取已租赁的车辆列表
    function getRentedCars() public view returns (uint[] memory) {
        return CarsPool[msg.sender].rentedCars;
    }

    // 获取已评价的车辆
    function getCommentedCars() public view returns(uint[] memory) {
        return CarsPool[msg.sender].commentedCars;
    }

    // 获取发布的车辆
    function getPublishedCars() public view returns(uint[] memory) {
        return CarsPool[msg.sender].publishedCars;
    }

    // 获取已归还的车辆
    function getReturnedCars() public view returns(uint[] memory) {
        return CarsPool[msg.sender].returnedCars;
    }

    // 获取车辆总数
    function getCarsLength() public view returns(uint) {
        return cars.length;
    }

    // 获取评价数量
    function getCommentLength(uint id) public view returns (uint) {
        return cars[id].comment;
    }

    // 获取租赁次数
    function getRentNums(uint id) public view returns(uint) {
        Car storage car = cars[id];
        RentNums storage r = car.rentNums[0];
        return r.rentNum;
    }

    // 获取车辆信息
    function getCarInfo(uint id) public view returns(address, string memory, string memory, string memory,
        string memory, string memory, string memory, string memory, uint, uint, uint, uint) {
        require(id < cars.length);
        Car storage car = cars[id];
        return (car.owner, car.nameWriter, car.style, car.publisherPublishAge, car.carNumber,
            car.intro, car.cover, car.status, car.pages, car.publishDate, car.score, car.comment);
    }

    // 获取评价信息
    function getCommentInfo(uint carId, uint commentId) public view returns(
        address, uint, uint, string memory) {
        require(carId < cars.length);
        require(commentId < cars[carId].comment);
        Comment storage c = cars[carId].comments[commentId];
        return (c.renter, c.date, c.score, c.content);
    }

    // 检查是否已评价
    function isEvaluated(uint id) public view returns (bool) {
        Car storage car = cars[id];
        for(uint i = 0; i < car.comment; i++)
            if(car.comments[i].renter == msg.sender)
                return true;
        return false;
    }

    // 检查是否已租赁
    function isRented(uint id) public view returns (bool) {
        OptCar storage optCar = CarsPool[msg.sender];
        for(uint i = 0; i < optCar.rentedCars.length; i++)
            if(optCar.rentedCars[i] == id)
                return true;
        return false;
    }

    // 检查是否是车主
    function isMyCar(uint id) public view returns(bool) {
        Car storage car = cars[id];
        return car.owner == msg.sender;
    }

    // 检查车辆是否已出租
    function isCarRented(uint id) public payable returns(bool) {
        require(id < cars.length);
        Car storage car = cars[id];
        return hashCompareInternal(car.status, "已出租");
    }

    // 发布车辆
    function publishCarInfo(string memory nameWriter, string memory style, string memory publisherPublishAge,
        string memory carNumber, string memory intro, string memory cover, string memory status,
        uint pages) public {
        uint id = cars.length;
        Car memory car = Car(msg.sender, nameWriter, style, publisherPublishAge, carNumber, intro,
            cover, status, pages, now, 0, 0);
        cars.push(car);
        CarsPool[msg.sender].publishedCars.push(id);
        emit publishCarSuccess(id, car.nameWriter, car.style, car.publisherPublishAge, car.carNumber,
            car.intro, car.cover, car.pages, car.status, car.publishDate);
    }

    // 评价车辆
    function evaluate(uint id, uint score, string memory content) public {
        require(id < cars.length);
        Car storage car = cars[id];
        require(0 <= score && score <= 10);
        car.score += score;
        car.comments[car.comment++] = Comment(msg.sender, now, score, content);
        CarsPool[msg.sender].commentedCars.push(id);
        emit evaluateSuccess(id, msg.sender, car.score);
    }

    // 归还车辆
    function returnCar(uint id) public {
        require(id < cars.length);
        Car storage car = cars[id];
        require(car.owner != msg.sender && isRented(id));
        car.status = "未出租";
        CarsPool[msg.sender].returnedCars.push(id);
        emit returnCarSuccess(id, msg.sender);
    }

    // 租赁车辆
    function rentCar(uint id) public {
        require(id < cars.length);
        Car storage car = cars[id];
        require(car.owner != msg.sender && !isRented(id));
        car.rentNums[0] = RentNums(tempNum++);
        CarsPool[msg.sender].rentedCars.push(id);
        car.status = "已出租";
        emit rentSuccess(id, msg.sender);
    }

    // 字符串比较
    function hashCompareInternal(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    // 回退函数
    function () external {
        revert();
    }
}