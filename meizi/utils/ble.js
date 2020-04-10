var app;
const Util = require('./util');
const CryptoJS = require('./crypto-js/crypto-js.js');
//最大扫描设备超时时间
const MaxScanTime    = 30000;
//最大扫描尝试次数
const MaxScanRetry   = 2;
//最大解锁尝试次数
const MaxUnlockRetry = 2

//进程状态类型
const StatusType = {
    NOTHING             : 0x00,
    ADAPTER_READY       : 0x01,
    SCANNING            : 0x02,
    DEVICE_FOUND        : 0x03,
    DEVICE_CONNECTING   : 0x04,
    DEVICE_CHECKING     : 0x05,
    DEVICE_READY        : 0x06,
    ERROR_OPEN_ADAPTER  : 0xF1,
    ERROR_SCAN          : 0xF2,
    ERROR_CONNECT       : 0xF3,
    ERROR_WRITE_CMD     : 0xF4,
    ERROR_OPENED        : 0xF5,
}

//蓝牙操作类型
const ActionType = {
    CheckDevice  : 1,
    Unlock       : 2,
    ListenReady  : 3,
    ListenChange : 4
}


//超限计数器,计时器
var Times = {scan:0,write:0,found:0};
var Timerout = {scanout:null,writeout:null};

//控制变量
var BLECallback = ()=>{};
var Action      = null;
var NeedSYNC    = false;
var scanID   = null;
var scanName = null;
var isRESET  = false;
var unlocked = false;

//设备变量
var DeviceID    = null;
var DeviceName  = null;
var ServiceUUID = {};
var ServiceChar = {};

var TmpRunStore = null;
var androidTryScan = false;

// console.log(new Uint8Array(createBuffer('FF4F','TSC01080001')))

//状态变量
var BLEStatus = {process:0,deviceFoundStatus:-1};

var Control = {
    run:function(lockname,lockid,action,needSync,callback){
        lockname = lockname.toUpperCase();
        lockid = lockid.toUpperCase();
        app = getApp();
        TmpRunStore = {lockname,lockid,action,needSync,callback};
        scanName = lockname;
        scanID = lockid;
        Action = action;
        NeedSYNC = !!needSync;
        if(callback) BLECallback = callback;
        console.log('准备执行任务',TmpRunStore)
        app.globalData.BLETestLog.push(`准备执行任务:${lockname}-${lockid}`);
        isRESET = false;
        setTimeout(()=>{prepareTask()},500);
    },
    reset:RESET,
    clearCallback:function(){
        BLECallback = ()=>{};
    }
}

function RESET(){
    if(BLEStatus.process>=StatusType.DEVICE_CHECKING){
        wx.closeBLEConnection({deviceId:DeviceID,complete:()=>{
            _reset();
        }})
    }else if(BLEStatus.process >= StatusType.SCANNING){
        wx.stopBluetoothDevicesDiscovery({complete:()=>{
            _reset();
        }});
    }
    function _reset(){
        wx.closeBluetoothAdapter();
        BLEStatus = {process:0,deviceFoundStatus:-1};
        Times = {scan:0,write:0,found:0};
        NeedSYNC    = false;
        Action      = null;
        DeviceID    = null;
        DeviceName  = null;
        ServiceUUID = {};
        ServiceChar = {};
        BLECallback = ()=>{};
        isRESET     = true;
        unlocked    = false;
        androidTryScan = false;
        clearTimeout(Timerout.scanout);
        console.log('蓝牙已被重置');
        app.globalData.BLETestLog.push('蓝牙模块已重置关停');
    }
}

//准备任务,判断当前模块运行状态
function prepareTask(){
    console.log('待执行任务',scanName,scanID,Action);
    console.log('当前蓝牙任务状态',BLEStatus,DeviceName,DeviceID);
    if(DeviceName && BLEStatus.process>=StatusType.ADAPTER_READY && !DeviceName.match(scanName)){
        console.log('蓝牙模块当前任务与提交任务不符,重新执行任务')
        RESET();
        setTimeout(()=>{Control.run(TmpRunStore.lockname,TmpRunStore.lockid,TmpRunStore.action,TmpRunStore.needSync,TmpRunStore.callback)},1000);
        return;
    }else if(Action == ActionType.CheckDevice && BLEStatus.process == StatusType.DEVICE_FOUND){
        console.log('蓝牙设备已找到,直接返回设备状态')
        BLECallback(null,{DeviceID:scanID,DeviceName,currentStatus:BLEStatus.deviceFoundStatus});
    }else if(Action == ActionType.ListenReady && BLEStatus.process == StatusType.DEVICE_READY){
        console.log('蓝牙已监听,等待监听状态变化')
        BLECallback(null,{DeviceID:scanID,DeviceName,currentStatus:BLEStatus.deviceFoundStatus});
    }else if(BLEStatus.process == StatusType.NOTHING){
        console.log('蓝牙未就绪,准备开启蓝牙桥接');
        ACT_OpenBLEAdapter();
    }else if(Action == ActionType.Unlock && BLEStatus.process == StatusType.DEVICE_READY){
        console.log('蓝牙已就绪,直接执行开锁任务');
        ACT_OpenLock();
    }else{
        console.log('任务模块冲突,重置任务');
        RESET();
        setTimeout(()=>{Control.run(TmpRunStore.lockname,TmpRunStore.lockid,TmpRunStore.action,TmpRunStore.needSync,TmpRunStore.callback)},1000);
    }

}

//开启蓝牙
function ACT_OpenBLEAdapter(){
    if(isRESET) return Control.reset();
    if(BLEStatus.process == StatusType.NOTHING){
        console.log('正在打开蓝牙模块');
        app.globalData.BLETestLog.push(`准备打开蓝牙模块`);
        let timeout = setTimeout(()=>{
            wx.closeBluetoothAdapter({
                complete:()=>{
                    ACT_OpenBLEAdapter();
                }
            });
        },5000);
        wx.openBluetoothAdapter({
            success:(res)=>{
                console.log('蓝牙模块打开成功')
                app.globalData.BLETestLog.push(`蓝牙模块打开成功`);
                BLEStatus.process = StatusType.ADAPTER_READY;
                if(app.globalData.localDevice.platform=='android' && !androidTryScan){
                    console.log('Android设备,准备发起蓝牙直连');
                    app.globalData.BLETestLog.push(`Android设备,发起直连测试`);
                    //安卓设备直接建立连接
                    DeviceID   = scanID.toUpperCase();
                    DeviceName = scanName.toUpperCase();
                    ACT_ConnectDevice();
                }else{
                    setTimeout(ACT_ScanDevices,500);
                }
            },
            fail:(res)=>{
                console.log('蓝牙模块打开失败',res)
                app.globalData.BLETestLog.push(`蓝牙模块打开失败,错误码:[${res.errCode}]`);
                BLECallback(StatusType.ERROR_OPEN_ADAPTER,null);
                if(res.errCode!=10001) Util.sendLog(Util.LogType.ERROR_LOCK_UNLOCK_BLE,`ADAPTER_NOT_SUPPORT$${app.globalData.userDevice.join('|')}`);
            },
            complete:()=>{
                clearTimeout(timeout);
            }
        })
    }else if(BLEStatus.process == StatusType.ADAPTER_READY){
        console.log('蓝牙模块已打开,NEXT')
        app.globalData.BLETestLog.push(`蓝牙模块已打开,准备执行下一步`);
        if(app.globalData.localDevice.platform=='android' && !androidTryScan){
            console.log('Android设备,准备发起蓝牙直连');
            app.globalData.BLETestLog.push(`Android设备,发起直连测试`);
            //安卓设备直接建立连接
            DeviceID   = scanID.toUpperCase();
            DeviceName = scanName.toUpperCase();
            ACT_ConnectDevice();
        }else{
            setTimeout(ACT_ScanDevices,500);
        }
    }
}

//蓝牙扫描开启与重试机制
function ACT_ScanDevices(){
    if(isRESET) return Control.reset();
    if(BLEStatus.process < StatusType.SCANNING){
        console.log('准备发起蓝牙扫描')
        app.globalData.BLETestLog.push(`准备发起蓝牙扫描`);
        let service = (Times.scan%2)==1?[]:['FEF5'];
        //延时1秒启动设备发现
        setTimeout(()=>{wx.startBluetoothDevicesDiscovery({
            services: service,
            // services: ['FEF5'],
            allowDuplicatesKey:true,
            success:(res)=>{
                console.log(`蓝牙扫描打开成功,开始发现设备,当前重试[${Times.scan}] 30s后超时`);
                app.globalData.BLETestLog.push(`扫描打开成功,当前扫描重试[${Times.scan}] 30s后超时`);
                BLEStatus.process = StatusType.SCANNING;
            },
            fail:(res)=>{
                //失败后关闭蓝牙重新执行
                app.globalData.BLETestLog.push(`扫描打开失败,错误码:[${res.errCode}]`);
                BLEStatus.process = StatusType.NOTHING;
                wx.stopBluetoothDevicesDiscovery();
                wx.closeBluetoothAdapter();
                ACT_OpenBLEAdapter();
            }
        })},500);
        //扫描超时重试
        Timerout.scanout = setTimeout(reScan,((Times.scan==0)?30000:MaxScanTime));
    }else{
        console.log('蓝牙正在扫描中或已找到设备,WAIT')
        app.globalData.BLETestLog.push('蓝牙正在扫描中或已找到设备,WAIT')
    }
}

function reScan(){
    console.log(`蓝牙扫描超时`);
    app.globalData.BLETestLog.push(`扫描超时`);
    //若已找到设备,取消
    if(BLEStatus.process >= StatusType.DEVICE_FOUND) return;
    if(isRESET) return;
    Times.scan++;

    //若重试次数达到上限
    if(Times.scan == MaxScanRetry){
        //超限,结束
        app.globalData.BLETestLog.push(`扫描重试次数超限,退出任务`);
        Util.sendLog(Util.LogType.ERROR_LOCK_UNLOCK_BLE,`SCAN_TIMEOUT$${app.globalData.userDevice.join('|')}`);
        BLECallback(StatusType.ERROR_SCAN,null);
        RESET();
        return;
    }
    //关闭设备发现重新打开
    clearTimeout(Timerout.scanout);
    console.log(`扫描任务重试`);
    app.globalData.BLETestLog.push(`扫描任务准备重试`);
    wx.stopBluetoothDevicesDiscovery({complete:()=>{
        wx.closeBluetoothAdapter({complete:()=>{
            BLEStatus.process = StatusType.NOTHING;
            ACT_OpenBLEAdapter();
        }});

    }});
}
var bledevices = {};
//蓝牙发现设备
wx.onBluetoothDeviceFound((res)=>{
    getApp().globalData.devicess = bledevices;
    //若已发现指定设备则中断返回
    if (BLEStatus.process >= StatusType.DEVICE_FOUND || isRESET) return;
    for (let device of res.devices) {
        // console.log(device.name,scanName);
        // if(device.name.match(/^TTIL/gi)){
        //     if(!bledevices[device.name]){
        //         bledevices[device.name] = device.deviceId;
        //         console.log(device.name,device.deviceId)
        //     }
        // }
        // continue;
        //设备匹配
        if (device.deviceId.match(scanID) || device.name.match(scanName)) {
            console.log(`发现目标设备:[${device.name}][${device.deviceId}]`);
            app.globalData.BLETestLog.push(`发现目标设备:[${device.name}][${device.deviceId}]`);
            //发现匹配设备自动终止蓝牙广播搜索
            console.log('发现设备后终止蓝牙搜索')
            app.globalData.BLETestLog.push(`停止蓝牙扫描功能`);
            BLEStatus.process = StatusType.DEVICE_FOUND;
            clearTimeout(Timerout.scanout);
            wx.stopBluetoothDevicesDiscovery();

            DeviceID   = device.deviceId;
            DeviceName = device.name;

            ACT_ConnectDevice();
        }
    }
});


function syncLockStatusByUser(){
    console.log('主动上报锁状态')
    wx.request({
        timeout:10000,
        url: `${app.globalData.lockAPIUrl}/lock/syncLockStatusByUser`,
        method: 'POST',
        data: {deviceName: scanName, deviceID: scanID, userPhone: app.globalData.userPhone, userDevice: app.globalData.userDevice,lockStatus:BLEStatus.deviceFoundStatus },
        success:(res)=>{
            console.log('上报成功');
        },
        fail:function(){
            syncLockStatusByUser();
        }
    })
}

//连接设备
function ACT_ConnectDevice() {
    if(isRESET) return Control.reset();
    //连接蓝牙设备
    console.log(`准备连接设备:[${DeviceName}][${DeviceID}]`)
    app.globalData.BLETestLog.push(`准备连接目标设备`);
    BLEStatus.process = StatusType.DEVICE_CONNECTING;
    wx.createBLEConnection({
        deviceId: DeviceID,
        //连接成功
        success: (res) => {
            console.log('设备连接成功,开始查找服务')
            app.globalData.BLETestLog.push(`目标设备连接成功,准备查找设备服务`);
            BLEStatus.process = StatusType.DEVICE_CHECKING;
            setTimeout(ACT_GetDeviceServices,1000);
        },
        //连接失败
        fail:(e) => {
            app.globalData.BLETestLog.push(`目标设备连接失败,错误码:[${e.errCode}]`);
            if(app.globalData.localDevice.platform=='android' && !androidTryScan){
                BLEStatus.process = StatusType.ADAPTER_READY;
                console.log('Android直连失败,重新发起扫描');
                app.globalData.BLETestLog.push(`Android直连失败,准备发起扫描任务`);
                androidTryScan = true;
                setTimeout(ACT_ScanDevices,500);
            }else{
                console.error('设备连接失败',e)
                app.globalData.BLETestLog.push(`连接设备失败,退出任务`);
                Util.sendLog(Util.LogType.ERROR_LOCK_UNLOCK_BLE,`BLE_CONNECT_FAIL$${app.globalData.userDevice.join('|')}`);
                BLECallback(StatusType.ERROR_CONNECT,null);
                RESET();
            }
        }
    });
}

function ACT_GetDeviceServices(){
    if(isRESET) return Control.reset();
    //获取服务UUID
    wx.getBLEDeviceServices({
        deviceId: DeviceID,
        success: function (res) {
            for (let service of res.services) {
                if (service.uuid.indexOf('F800') != -1) {
                    ServiceUUID.dataID = service.uuid;
                } else if (service.uuid.indexOf('180F') != -1) {
                    ServiceUUID.batteryID = service.uuid;
                }
            }
            console.log('获取设备服务成功,准备查找服务特征')
            app.globalData.BLETestLog.push(`获取设备服务成功`);
            //延时获取服务Charact
            setTimeout(ACT_GetDeviceCharacteristics,1000);
        },
        fail:function(err){
            console.log('获取设备服务失败,重试',err);
            app.globalData.BLETestLog.push(`获取服务失败,准备重试 | 错误码:[${err.errCode}]`);
            ACT_GetDeviceServices();
        }
    })
}

//获取服务Charact
function ACT_GetDeviceCharacteristics() {
    if(isRESET) return Control.reset();
    console.log(`开始查找设备准备查找特征值`);
    app.globalData.BLETestLog.push(`准备获取设备服务特征`);
    wx.getBLEDeviceCharacteristics({
        deviceId: DeviceID,
        serviceId: ServiceUUID.dataID,
        success: (res) => {
            console.log('获取设备服务特征值成功');
            app.globalData.BLETestLog.push('获取设备服务特征值成功');
            for (let char of res.characteristics) {
                if (char.uuid.indexOf('F801') != -1) ServiceChar.writeChar = char.uuid
                else if (char.uuid.indexOf('F802') != -1) ServiceChar.notifyChar = char.uuid
            }
            //注册状态变化接收
            wx.onBLECharacteristicValueChange(ACT_BLEDeviceCharNotify);
            //监听指定设备服务的状态变化
            console.log('准备监听设备服务状态变化')
            app.globalData.BLETestLog.push('准备监听设备服务状态变化')
            wx.notifyBLECharacteristicValueChange({
                deviceId: DeviceID,
                serviceId: ServiceUUID.dataID,
                characteristicId: ServiceChar.notifyChar,
                state: true,
                success:(res)=>{
                    console.log('设备服务监听成功,等待服务状态变化');
                    app.globalData.BLETestLog.push('设备服务监听成功,等待服务状态变化');
                    BLEStatus.process = StatusType.DEVICE_READY;  //当前进程:设备就绪

                    //写入状态查询指令
                    wx.writeBLECharacteristicValue({
                        deviceId: DeviceID,
                        serviceId: ServiceUUID.dataID,
                        characteristicId: ServiceChar.writeChar,
                        value: createBuffer('FF51',DeviceName)
                    });
                },
                fail:(res)=>{
                    console.error('设备服务监听失败,返回');
                    app.globalData.BLETestLog.push(`设备服务监听失败,退出任务 | 错误码:[${res.errCode}]`);
                    if(Action > ActionType.CheckDevice) BLECallback(StatusType.ERROR_CONNECT,null);
                    RESET();
                }
            });
        },
        fail:function(res){
            app.globalData.BLETestLog.push(`获取设备服务特征失败,退出任务 | 错误码:[${res.errCode}]`);
            if(Action > ActionType.CheckDevice) BLECallback(StatusType.ERROR_CONNECT,null);
            RESET();
        }
    })
}

//开锁
function ACT_OpenLock() {
    if(isRESET) return Control.reset();
    //向蓝牙服务写入开锁指令
    console.log('准备写入解锁指令');
    app.globalData.BLETestLog.push('准备写入解锁指令');
    writeOpenCommand();
}

//写入解锁指令
function writeOpenCommand(){
    if(isRESET) return Control.reset();
    let unlockBuffer = createBuffer('FF4F',DeviceName);
    console.log('解锁指令:', new Uint8Array(unlockBuffer));
    wx.writeBLECharacteristicValue({
        deviceId: DeviceID,
        serviceId: ServiceUUID.dataID,
        characteristicId: ServiceChar.writeChar,
        value: unlockBuffer,
        success:(res)=>{
            console.log('解锁指令写入成功,等待解锁');
            app.globalData.BLETestLog.push('解锁指令写入成功,等待解锁');
        },
        fail:()=>{
            Times.write++;
            if(Times.write==MaxUnlockRetry){
                app.globalData.BLETestLog.push(`解锁错误次数超限,退出任务`);
                Util.sendLog(Util.LogType.ERROR_LOCK_UNLOCK_BLE,`BLE_UNLOCK_FAIL$${app.globalData.userDevice.join('|')}`);
                BLECallback(StatusType.ERROR_WRITE_CMD,null);
                RESET();
                return;
            }
            console.log(`解锁指令写入失败,当前重试[${Times.write}]`);
            app.globalData.BLETestLog.push(`解锁指令写入失败,当前重试[${Times.write}]`);
            writeOpenCommand();
        }
    });
}

//设备消息通知
function ACT_BLEDeviceCharNotify(notifyData) {
    console.log('接受到设备消息:',notifyData)
    if(Action == ActionType.Unlock && unlocked) return;
    if(isRESET) return Control.reset();
    //获取当前状态
    let statusValue = arrayBufferToHexString(notifyData.value);
    let status = Number(statusValue[3]);
    //自动同步当前锁状态
    if(Action == ActionType.CheckDevice || Action == ActionType.ListenReady){
        console.log('ActionType.CheckDevice');
        BLEStatus.deviceFoundStatus = status;
        console.log('当前设备状态获取成功:',status);
        app.globalData.BLETestLog.push(`当前设备状态获取成功:[${status}]`);
        if(NeedSYNC) syncLockStatusByUser();
        BLECallback(null,{DeviceID:scanID,DeviceName,currentStatus:BLEStatus.deviceFoundStatus});
    }else if(Action == ActionType.Unlock){
        console.log('ActionType.Unlock');
        if(BLEStatus.deviceFoundStatus == -1){
            if(status == 1){
                app.globalData.BLETestLog.push(`设备当前为开锁状态,无需二次开锁,退出任务`);
                unlocked = true;
                //如果动作为开锁,且当前锁状态已是开锁状态,则不进行下一步
                BLECallback(StatusType.ERROR_OPENED,null);
                RESET();
            }else{
                BLEStatus.deviceFoundStatus = status;
                console.log('当前设备状态获取成功:',status);
                app.globalData.BLETestLog.push(`设备状态获取成功:[${status}]`);
                if(NeedSYNC) syncLockStatusByUser();
                setTimeout(ACT_OpenLock,1000);
            }
        }else if(BLEStatus.deviceFoundStatus==0 && status==1){
            unlocked = true;
            console.log(`蓝牙设备状态变更,当前状态:[${status}]`);
            app.globalData.BLETestLog.push(`设备状态变更为 [${status}]`);
            BLECallback(null,{DeviceID:scanID,DeviceName,preStatus:BLEStatus.deviceFoundStatus,newStatus:status});
            RESET();
        }
    }else if(Action == ActionType.ListenChange){
        console.log('ActionType.ListenChange');
        if(BLEStatus.deviceFoundStatus == -1){
            BLEStatus.deviceFoundStatus = status;
            console.log('当前设备状态获取成功:',status);
            app.globalData.BLETestLog.push(`设备状态获取成功:[${status}]`);
            if(NeedSYNC) syncLockStatusByUser();
        }else{
            // console.log('上锁后蓝牙会自动断开');
            app.globalData.BLETestLog.push(`设备已上锁,退出任务`);
            BLECallback(null,{DeviceID:scanID,DeviceName,preStatus:BLEStatus.deviceFoundStatus,newStatus:status});
            RESET();
        }
    }

}

//工具
function arrayBufferToHexString(buffer){
    let bufferType = Object.prototype.toString.call(buffer)
    if (buffer != '[object ArrayBuffer]') {
        return
    }
    let dataView = new DataView(buffer)
    let hexStr = '';
    for (var i = 0; i < dataView.byteLength; i++) {
        var str = dataView.getUint8(i);
        var hex = (str & 0xff).toString(16);
        hex = (hex.length === 1) ? '0' + hex : hex;
        hexStr += hex;
    }
    return hexStr.toUpperCase();
}
function createBuffer(hex,SSID){
    console.log('生成命令',[hex,SSID]);
    if(SSID){
        if(SSID.match(/TSC/gi)){
            let originStr = (SSID.match(/TSC(\w{8})/i)[1]).split('');
            originStr.push(...originStr);
            originStr = originStr.join('');
            console.log('明文', originStr);
            var AESKey = '347289a4ffb4c9eedf7890e1454088aa';
            AESKey = CryptoJS.enc.Hex.parse(AESKey);

            var encrypted = CryptoJS.AES.encrypt(originStr, AESKey, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7,
                iv: '',
            });
            let encryptCode = CryptoJS.enc.Base64.parse(encrypted.toString()).toString();
            console.log('密文', encryptCode);
            encryptCode = encryptCode.substr(0, 8);
            hex = `${encryptCode}${hex}`;
            // let data = new Array(6);
            // data.fill(0);
            // for (let i = 0; i < 8; i++) {
            //     if (i % 2 == 1) data[Math.floor(i / 2)] = parseInt(`${encryptCode[i - 1]}${encryptCode[i]}`, 16);
            // }
            // data[4] = 0xff;
            // data[5] = 0x4f;
            // console.log('解锁指令', data)
        }else{
            hex = hex;
        }
    }
    let typedArray = new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
    }));
    console.log('解锁指令', typedArray.buffer)
    return typedArray.buffer;
    
    
}

module.exports = {Control,ActionType,StatusType};
