import React, { useEffect, useState } from "react";
export default function App() {
    const [dataRs232, setDataRs232] = useState("");
    const [port, setPort] = useState(null);
    const [Writer, setWriter] = useState(null);
    const [serialData, setSerialData] = useState([]);

    async function serial_open() {
        var main_port = null;
        var main_port_quit = false;
        var main_reader = null;
        var main_textDecoder = new TextDecoder();
        var main_writer = null;
        let items = [];

        try {
            main_port = await navigator.serial.requestPort({});
        } catch (e) {
            let message = e.message;
            if (message != "No port selected by the user.") {
                console.log("serial_connect(): ", message);
            }
            main_port = null;
            return;
        }
        let args = {
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: "none",
            bufferSize: 16384,
            flowControl: "none",
        };
        try {
            await main_port.open(args);
            setPort(main_port);
            const textEncoder = new TextEncoderStream();
            textEncoder.readable.pipeTo(main_port.writable);
            setWriter(textEncoder.writable.getWriter());
        } catch (e2) {
            let msg = e2.message;
            if (msg == "Failed to open serial port.") {
                msg = "Port in use? " + msg;
            }
            console.log("serial_connect(): ", msg);
            main_port = null;
            return;
        }
        if (main_port) {
            (async () => {
                while (main_port.readable && !main_port_quit) {
                    main_reader = main_port.readable.getReader();
                    try {
                        while (!main_port_quit) {
                            const { value, done } = await main_reader.read();
                            if (done) {
                                break;
                            }
                            let text = main_textDecoder.decode(value);
                            if (text) {
                                console.log("🚀 ~ text:", text);
                                var data = text.trim(); // trim 2 đầu bỏ khoảng trắng
                                if (data.length > 12) continue; // cân chỉ có 10 kí tự nên lấy nhưng chuỗi nhỏ hơn 12 ( 10 cung dc) còn lại thì bỏ qua

                                // bỏ các kí tự linh tinh, và chỉ lấy các chuỗi có số , dấu chấm, kí tự k g kg , còn lại thì không lấy
                                data != "" &&
                                    !data.includes("\n") &&
                                    !data.includes("\r") &&
                                    items.push(data);
                                // log items để xem
                                // lấy chuỗi trong mảng join lại rồi đem đi xét
                                if (data.length < 12) {
                                    const regex = /^[0-9]+\.[0-9]+\s*kg$/;
                                    const match = data.match(regex);
                                    // là chuỗi đủ thông tin
                                    if (match) {
                                        serialData.push(match[0]); // đẩy vào mảng chính
                                        if (serialData.length == 10) serialData.shift(); // mảng chính chỉ có 10 items, xóa thằng đầu đi, thêm vào cuối
                                        items = []; // lúc này thì chuỗi đã đủ thông tin nên reset mảng tạm
                                    }
                                }
                                // trường hợp các item trong mảng tạm có item g hoặc kg => từ g cuối thì là chuỗi đủ
                                if (items.includes("g") || items.includes("kg")) {
                                    serialData.push(items.join("").trim());
                                    if (serialData.length == 10) serialData.shift();
                                    items = [];
                                }
                            }
                        }
                    } catch (error) {
                        console.log(error);
                    } finally {
                        main_reader.releaseLock();
                        main_reader = null;
                    }
                }
                let timeout = 30;
                while (main_writer && timeout) {
                    await sleep(100);
                    timeout--;
                }
                await main_port.close();
                if ("serial" in navigator) {
                    await main_port.forget();
                }
                main_port = null;
                main_reader = null;
            })();
        } else {
            console.log("Abc");
        }
    }
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    const [Code, setCode] = useState("");
    const [Numbers, setNumbers] = useState("");
    const [ListData, setListData] = useState([]);
    const EnterCode = async (e) => {
        if (e.key === "Enter") {
            await Writer.write("R");
            //format số kg để show ra màn hình
            const data = serialData[serialData.length - 1];
            console.log(serialData);
            if (data) {
                const match = data.match(/([0-9.]+)\s*([a-zA-Z]+)/);
                const formattedData = `${match[1]}`;
                setDataRs232(formattedData);

                // Thêm phần tử mới vào đầu mảng
                const newEntry = {
                    Code: Code,
                    DataKg: formattedData,
                    Numbers: Numbers,
                    Package: ListData.length + 1,
                };
                setListData([newEntry, ...ListData]);

                // Xóa các trường nhập sau khi thêm dữ liệu
                setCode("");
                setNumbers("");
                await Writer.write("Y");
            } else {
                alert("Không có dữ liệu");
            }
        }
    };

    return (
        <div className="content-wrapper" style={{ marginTop: "10px", marginLeft: "10px" }}>
            <button onClick={async () => await serial_open()}> Kết nối API trạm cân</button>
            <p>Trạng thái: {port ? "Đã kết nối với API trạm cân" : "Chưa kết nối"}</p>

            <div>
                <span>Số lượng:</span>{" "}
                <input
                    value={Numbers}
                    onChange={(e) => {
                        setNumbers(e.target.value);
                    }}
                    onKeyPress={(e) => EnterCode(e)}
                ></input>
                <button
                    onClick={async () => {
                        console.log("🚀 ~ onClick={ ~ Writer:", await Writer.write("R"));

                        // await Writer.write("Y");
                        //format số kg để show ra màn hình
                        const data = serialData[serialData.length - 1];
                        if (data) {
                            const match = data.match(/([0-9.]+)\s*([a-zA-Z]+)/);
                            setDataRs232(`${match[1]} ${match[2]}`);
                        } else {
                            alert("Không có dữ liệu");
                        }
                    }}
                >
                    Cân Lại
                </button>
            </div>

            <div>
                <span>Code:</span>
                <input
                    style={{ marginLeft: "31px" }}
                    value={Code}
                    onChange={(e) => {
                        setCode(e.target.value);
                    }}
                    onKeyPress={(e) => EnterCode(e)}
                ></input>
            </div>

            <div>
                <h1>
                    Tổng trọng lượng: {ListData.reduce((a, v) => (a = a + parseFloat(v.DataKg)), 0)}{" "}
                    KG
                </h1>
                <table border="1" style={{ width: "100%", padding: "10px", marginLeft: "-5px" }}>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Mã</th>
                            <th>Số lượng</th>
                            <th>Trọng lượng (KG)</th>
                            <th>Số lần cân</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ListData.map((item, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{item.Code}</td>
                                <td>{item.Numbers}</td>
                                <td>{item.DataKg}</td>
                                <td> Lần {item.Package}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

//DUNG XOA DUNG XOA DUNG XOA DUNG XOA

// async function serial_close() {
//     setStatus("warning", "Closing serial port");
//     main_port_quit = true;
//     if (main_port) {
//         if (main_reader != null) {
//             main_reader.cancel();
//         }
//         await main_serialReaderPromise;
//     }
//     setStatus("OK", null);
// }
// async function serialWrite(data) {
//     while (!main_port_quit && data != null && main_port && main_port.writable) {
//         const dataArrayBuffer = main_textEncoder.encode(data);
//         main_writer = main_port.writable.getWriter();
//         let isOK = true;
//         try {
//             await main_writer.write(dataArrayBuffer);
//         } catch (e) {
//             isOK = false;
//             console.log(e);
//         } finally {
//             main_writer.releaseLock();
//         }
//         main_writer = null;
//         if (main_port_quit || !isOK) {
//             break;
//         }
//         data = txBuffer.getNext();
//         setMainProgress();
//     }
//     await sleep(10);
// // }
// async function serialreader() {
//     while (main_port.readable && !main_port_quit) {
//         main_reader = main_port.readable.getReader();
//         try {
//             while (!main_port_quit) {
//                 const { value, done } = await main_reader.read();
//                 if (done) {
//                     break;
//                 }
//                 let text = main_textDecoder.decode(value);
//                 termLines.appendTermText(text);
//                 termInputUpdate();
//             }
//         } catch (error) {
//             console.log(error);
//         } finally {
//             main_reader.releaseLock();
//             main_reader = null;
//         }
//     }
//     let timeout = 30;
//     while (main_writer && timeout) {
//         await sleep(100);
//         timeout--;
//     }
//     await main_port.close();
//     if ("serial" in navigator && "forget" in SerialPort.prototype) {
//         await main_port.forget();
//     }
//     main_port = null;
//     main_reader = null;
// }
// const call = async () => {
//     const selectedPort = await navigator.serial.requestPort();
//     await selectedPort.open({ baudRate: 9600, bufferSize: 16384 });
//     // setPort(selectedPort);
//     const textEncoder = new TextEncoderStream();
//     textEncoder.readable.pipeTo(selectedPort.writable);
//     setWriter(textEncoder.writable.getWriter());
//     const textDecoder = new TextDecoderStream();
//     selectedPort.readable.pipeTo(textDecoder.writable);
//     const reader = textDecoder.readable.getReader();

//     let items = [];
//     while (true) {
//         const { value, done } = await reader.read();
//         if (done) {
//             break;
//         }
//         // value is a string.
//         // if (value) {
//         //     var data = value.trim();
//         //     data != "" && !data.includes("\n") && !data.includes("\r") && data.match(/^(?:[0-9.]+|kg+)$/i) && items.push(data);
//         //     // console.log(data, items);
//         //     if (data.length < 12) {
//         //         const regex = /^[0-9]+\.[0-9]+\s*kg$/;
//         //         const match = data.match(regex);
//         //         if (match) {
//         //             serialData.push(match[0]);
//         //             if (serialData.length == 10) serialData.shift();
//         //             items = [];
//         //         }
//         //     }
//         //     if (items.includes("g") || items.includes("kg")) {
//         //         serialData.push(items.join("").trim());
//         //         if (serialData.length == 10) serialData.shift();
//         //         items = [];
//         //     }
//         //     // console.log(serialData);
//         // }
//         console.log(value);
//     }
// };
