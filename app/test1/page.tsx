'use client'; // Chỉ thị này thường được sử dụng trong Next.js để đánh dấu đây là Client Component.

import React, { useState, useRef, useEffect, MouseEvent } from 'react'; // Import các hook và kiểu từ React
import { HelpCircle, ZoomIn, XCircle, Pencil, RotateCcw } from 'lucide-react'; // Import các icon từ thư viện lucide-react

// Định nghĩa kiểu cho vị trí (tọa độ x, y)
interface Position {
  x: number;
  y: number;
}

// Component chính của ứng dụng
const LetterTracingApp: React.FC = () => {
  // --- Các biến State (quản lý trạng thái giao diện) ---
  const [isDrawing, setIsDrawing] = useState<boolean>(false); // Trạng thái có đang vẽ hay không
  const [showModal, setShowModal] = useState<boolean>(false); // Hiển thị modal phóng to
  const [showHelp, setShowHelp] = useState<boolean>(false); // Hiển thị phần trợ giúp
  const [showCelebration, setShowCelebration] = useState<boolean>(false); // Hiển thị hiệu ứng ăn mừng khi hoàn thành
  const [completionPercentage, setCompletionPercentage] = useState<number>(0); // Tỷ lệ hoàn thành (từ 0 đến 100)
  const [showPencil, setShowPencil] = useState<boolean>(false); // Hiển thị con trỏ chuột hình bút chì tùy chỉnh
  const [pencilPosition, setPencilPosition] = useState<Position>({ x: 0, y: 0 }); // Vị trí của con trỏ bút chì

  // --- Các Ref (tham chiếu đến các phần tử DOM hoặc giá trị cần giữ giữa các lần render) ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // Tham chiếu đến thẻ canvas ở chế độ xem nhỏ
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null); // Tham chiếu đến thẻ canvas trong modal
  const currentContext = useRef<CanvasRenderingContext2D | null>(null); // Tham chiếu đến context 2D của canvas hiện tại (để vẽ)
  const lastPosition = useRef<Position>({ x: 0, y: 0 }); // Lưu vị trí cuối cùng của chuột khi đang vẽ
  const tracedPixels = useRef<Set<string>>(new Set()); // Lưu trữ các tọa độ pixel mà người dùng đã tô qua (dưới dạng chuỗi "x,y")
  const traceablePixels = useRef<Set<string>>(new Set()); // Lưu trữ các tọa độ pixel của chữ cái mẫu cần tô (để tính tỷ lệ hoàn thành)

  // --- Hàm Khởi tạo Canvas ---
  // Thiết lập canvas, vẽ lưới và chữ mẫu
  const initializeCanvas = () => {
    // Chọn canvas hiện tại dựa trên trạng thái showModal
    const canvas = showModal ? modalCanvasRef.current : canvasRef.current;
    if (!canvas) return; // Dừng lại nếu không tìm thấy canvas

    // Lấy context 2D để vẽ lên canvas
    const context = canvas.getContext('2d');
    if (!context) return; // Dừng lại nếu không lấy được context
    currentContext.current = context; // Lưu context vào ref

    // Định nghĩa kích thước canvas (đặt cứng hoặc lấy từ thuộc tính width/height của thẻ canvas)
    const width = canvas.width; // Lấy từ thuộc tính của thẻ <canvas>
    const height = canvas.height; // Lấy từ thuộc tính của thẻ <canvas>


    // Xóa toàn bộ nội dung trên canvas
    context.clearRect(0, 0, width, height);

    // Vẽ lưới
    context.strokeStyle = '#a0e6ff'; // Màu nét lưới (xanh nhạt)
    context.lineWidth = 0.5; // Độ dày nét lưới

    const gridSize = showModal ? 40 : 20; // Kích thước ô lưới (lớn hơn trong modal)

    // Vẽ các đường lưới dọc
    for (let x = 0; x <= width; x += gridSize) {
      context.beginPath(); // Bắt đầu một đường dẫn mới
      context.moveTo(x, 0); // Di chuyển đến điểm bắt đầu của đường kẻ
      context.lineTo(x, height); // Vẽ đường kẻ đến điểm kết thúc
      context.stroke(); // Tô nét đường kẻ
    }

    // Vẽ các đường lưới ngang (5 đường, tạo ra 4 dòng)
    const rowHeight = showModal ? 40 : 20; // Chiều cao của mỗi dòng
    for (let y = 0; y <= height; y += rowHeight) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    // Vẽ chữ cái mẫu cần tô
    drawTraceableLetter(context, width, height);

    // Đặt lại tập hợp các pixel đã tô và tỷ lệ hoàn thành
    tracedPixels.current = new Set();
    setCompletionPercentage(0);
  };

  // --- Hook useEffect ---
  // Chạy khi component mount hoặc showModal thay đổi
  // Khởi tạo canvas khi component được render lần đầu hoặc khi modal được mở/đóng
  useEffect(() => {
    // Hàm initializeCanvas sẽ được gọi
    // Hook này không cần initializeCanvas trong dependency array vì initializeCanvas không thay đổi giữa các lần render
    initializeCanvas();

    // Hàm cleanup: Dọn dẹp tài nguyên nếu cần khi component unmount
    // (Trong trường hợp này không cần dispose canvas context tường minh như Fabric.js,
    // chỉ cần ensure các ref được quản lý đúng)
  }, [showModal]); // Chạy lại effect khi giá trị showModal thay đổi

  // --- Hàm Vẽ Chữ Cái Mẫu ---
  // Vẽ chữ 'b' mẫu (đen) và chữ 'b' mờ (cần tô)
  const drawTraceableLetter = (context: CanvasRenderingContext2D, width: number, height: number) => {
    // Định nghĩa kích thước và kiểu font cho chữ
    const fontSize = showModal ? '120px' : '48px';
    const fontStyle = 'cursive'; // Kiểu chữ viết tay

    // Vẽ chữ mẫu màu đen (để người dùng tham khảo)
    context.font = `${fontSize} ${fontStyle}`;
    const modelX = showModal ? 100 : 40; // Vị trí X của chữ mẫu
    const modelY = showModal ? 140 : 60; // Vị trí Y của chữ mẫu (baseline của chữ)
    context.fillStyle = '#000000'; // Màu chữ mẫu (đen)
    context.fillText('b', modelX, modelY); // Vẽ chữ 'b' mẫu

    // Vẽ chữ cần tô màu mờ
    const letterX = showModal ? 300 : 120; // Vị trí X của chữ cần tô
    const letterY = showModal ? 140 : 60; // Vị trí Y của chữ cần tô
    context.font = `${fontSize} ${fontStyle}`;
    context.fillStyle = 'rgba(200, 200, 200, 0.4)'; // Màu chữ cần tô (xám mờ)
    context.fillText('b', letterX, letterY); // Vẽ chữ 'b' mờ

    // --- Xác định các Pixel của Chữ Cần Tô để Theo dõi Hoàn thành ---
    traceablePixels.current = new Set(); // Xóa các pixel cũ

    // Ước lượng kích thước chữ để chỉ kiểm tra pixel trong vùng này
    // LƯU Ý: Cách này ước lượng dựa trên font size và vị trí, không chính xác hoàn toàn
    // và có thể bỏ sót pixel thật của chữ nếu font cursive có hình dạng phức tạp.
    // Cách chính xác hơn sẽ cần vẽ chữ lên một canvas tạm và đọc pixel data từ đó.
    const letterWidth = showModal ? 80 : 30; // Chiều rộng ước lượng của chữ
    const letterHeight = showModal ? 160 : 60; // Chiều cao ước lượng của chữ (âm xuống dưới baseline)

    // Tính toán vùng pixel có thể thuộc về chữ
    // Vòng lặp này đi qua các pixel trong một hình chữ nhật bao quanh vị trí chữ
    for (let x = letterX - letterWidth / 2; x < letterX + letterWidth / 2; x++) {
      // Chiều cao chữ cursive thường kéo dài lên trên và xuống dưới baseline
      for (let y = letterY - letterHeight; y < letterY + letterHeight / 4; y++) {
        // Thêm các tọa độ pixel vào tập traceablePixels
        traceablePixels.current.add(`${Math.round(x)},${Math.round(y)}`);
      }
    }
  };

  // --- Hàm Đặt lại Canvas ---
  // Xóa các nét vẽ của người dùng và đặt lại trạng thái
  const resetCanvas = () => {
    initializeCanvas(); // Chỉ cần gọi lại hàm khởi tạo
  };

  // --- Xử lý Sự kiện Chuột ---

  // Xử lý di chuyển chuột (cho con trỏ bút chì và vẽ)
  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = showModal ? modalCanvasRef.current : canvasRef.current;
    if (!canvas) return;

    // Lấy vị trí chuột tương đối trên canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Cập nhật vị trí con trỏ bút chì tùy chỉnh
    setPencilPosition({ x: e.clientX, y: e.clientY });
    setShowPencil(true); // Hiển thị con trỏ bút chì

    // Nếu đang trong trạng thái vẽ, gọi hàm draw
    if (isDrawing) {
      draw(e);
    }
  };

  // Xử lý khi chuột rời khỏi canvas
  const handleMouseLeave = () => {
    setShowPencil(false); // Ẩn con trỏ bút chì
    stopDrawing(); // Dừng vẽ nếu đang vẽ
  };

  // Xử lý khi nhấn chuột xuống (bắt đầu vẽ)
  const startDrawing = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = showModal ? modalCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    const context = currentContext.current;
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true); // Đặt trạng thái đang vẽ là true
    lastPosition.current = { x, y }; // Lưu vị trí bắt đầu vẽ

    // Vẽ một điểm nhỏ ngay tại vị trí nhấn chuột để bắt đầu nét vẽ
    context.beginPath();
    context.arc(x, y, 2, 0, Math.PI * 2); // Vẽ hình tròn nhỏ
    context.fillStyle = '#2196F3'; // Màu nét vẽ
    context.fill(); // Tô màu hình tròn
    context.closePath();

    // Cập nhật tỷ lệ hoàn thành cho điểm đầu tiên
    updateCompletionPercentage(x, y);
  };

  // Xử lý khi di chuyển chuột trong lúc đang nhấn (vẽ)
  const draw = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return; // Chỉ vẽ khi isDrawing là true

    const canvas = showModal ? modalCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    const context = currentContext.current;
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Vẽ đường thẳng từ vị trí cuối cùng đến vị trí hiện tại của chuột
    context.beginPath();
    context.moveTo(lastPosition.current.x, lastPosition.current.y);
    context.lineTo(x, y);
    context.strokeStyle = '#2196F3'; // Màu nét vẽ
    context.lineWidth = showModal ? 4 : 2; // Độ dày nét vẽ (lớn hơn trong modal)
    context.lineCap = 'round'; // Đầu nét vẽ tròn
    context.stroke(); // Tô nét đường thẳng
    context.closePath();

    // Vẽ lại điểm nhỏ tại vị trí hiện tại (tạo cảm giác nét liền mạch)
    context.beginPath();
    context.arc(x, y, showModal ? 3 : 2, 0, Math.PI * 2);
    context.fillStyle = '#2196F3';
    context.fill();
    context.closePath();


    lastPosition.current = { x, y }; // Cập nhật vị trí cuối cùng
    updateCompletionPercentage(x, y); // Cập nhật tỷ lệ hoàn thành cho các điểm vừa vẽ
  };

  // Xử lý khi nhả chuột (dừng vẽ)
  const stopDrawing = () => {
    setIsDrawing(false); // Đặt trạng thái đang vẽ là false
  };

  // --- Hàm Cập nhật Tỷ lệ Hoàn thành ---
  // Tính toán và cập nhật tỷ lệ pixel đã tô so với pixel của chữ mẫu
  const updateCompletionPercentage = (x: number, y: number) => {
    // Thêm pixel hiện tại và các pixel lân cận (trong bán kính) vào tập tracedPixels
    // Bán kính giúp việc tô màu dễ "ăn" vào chữ mẫu hơn
    const radius = 5;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Kiểm tra xem điểm có nằm trong hình tròn bán kính không
        if (dx * dx + dy * dy <= radius * radius) {
          tracedPixels.current.add(`${Math.round(x + dx)},${Math.round(y + dy)}`);
        }
      }
    }

    // --- Tính toán Tỷ lệ ---
    let hitCount = 0; // Đếm số pixel của chữ mẫu đã bị tô trúng
    let totalPixels = 0; // Tổng số pixel của chữ mẫu

    // Duyệt qua tất cả các pixel của chữ mẫu
    traceablePixels.current.forEach(pixel => {
      totalPixels++;
      // Kiểm tra xem pixel này có nằm trong tập tracedPixels không
      if (tracedPixels.current.has(pixel)) {
        hitCount++;
      }
    });

    // Tính phần trăm, đảm bảo tổng pixel > 0 để tránh chia cho 0
    let percentage = 0;
    if (totalPixels > 0) {
      percentage = (hitCount / totalPixels) * 100;
    }


    // Cập nhật state, giới hạn tối đa là 100%
    setCompletionPercentage(Math.min(percentage, 100));

    // --- Kích hoạt Hiệu ứng Ăn mừng ---
    // Nếu tỷ lệ hoàn thành vượt quá 40% (có thể điều chỉnh ngưỡng này) và hiệu ứng chưa hiển thị
    if (percentage > 40 && !showCelebration) {
      setShowCelebration(true); // Hiển thị hiệu ứng
      // Tự động ẩn hiệu ứng sau 5 giây
      setTimeout(() => setShowCelebration(false), 5000);
    }
  };


  // --- Phần Render Giao diện (JSX) ---
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* --- Con trỏ Bút chì Tùy chỉnh --- */}
      {/* Hiển thị icon bút chì theo vị trí chuột */}
      {showPencil && (
        <div
          className="fixed pointer-events-none z-50" // Vị trí cố định, bỏ qua sự kiện chuột, z-index cao
          style={{
            left: `${pencilPosition.x}px`,
            top: `${pencilPosition.y}px`,
            transform: 'translate(-12px, -24px)' // Điều chỉnh vị trí để đầu bút chì trùng với con trỏ chuột
          }}
        >
          <Pencil size={24} color="#ff6600" /> {/* Icon bút chì */}
        </div>
      )}

      {/* --- Chế độ Xem Nhỏ (mặc định) --- */}
      {!showModal && (
        <div className="relative border border-blue-400 rounded shadow-md bg-white">
          {/* Thẻ canvas để vẽ */}
          <canvas
            ref={canvasRef} // Gắn ref để truy cập phần tử DOM canvas
            width={300} // Chiều rộng canvas
            height={100} // Chiều cao canvas
            className="cursor-none" // Ẩn con trỏ chuột mặc định
            onMouseDown={startDrawing} // Gọi hàm khi nhấn chuột xuống
            onMouseMove={handleMouseMove} // Gọi hàm khi di chuyển chuột
            onMouseUp={stopDrawing} // Gọi hàm khi nhả chuột
            onMouseLeave={handleMouseLeave} // Gọi hàm khi chuột rời khỏi canvas
          />

          {/* Hiển thị tỷ lệ hoàn thành ở góc trên bên phải */}
          <div className="absolute top-0 right-0 bg-blue-100 p-1 text-xs rounded-bl">
            {Math.round(completionPercentage)}% hoàn thành {/* Hiển thị phần trăm làm tròn */}
          </div>

          {/* Nút Phóng to (mở modal) */}
          <button
            className="absolute bottom-0 right-0 p-1 bg-blue-100 text-blue-600 rounded-tl hover:bg-blue-200"
            onClick={() => setShowModal(true)} // Cập nhật state để mở modal
          >
            <ZoomIn size={16} /> {/* Icon phóng to */}
          </button>

          {/* Nút Đặt lại */}
          <button
            className="absolute bottom-0 right-8 p-1 bg-blue-100 text-blue-600 rounded-tl hover:bg-blue-200"
            onClick={resetCanvas} // Gọi hàm đặt lại canvas
          >
            <RotateCcw size={16} /> {/* Icon đặt lại */}
          </button>

          {/* Nút Trợ giúp và tooltip */}
          <div className="absolute bottom-0 left-0">
            <button
              className="p-1 text-gray-500 hover:text-blue-600"
              onClick={() => setShowHelp(!showHelp)} // Bật/tắt hiển thị tooltip khi click
              onMouseEnter={() => setShowHelp(true)} // Hiển thị tooltip khi rê chuột vào
              onMouseLeave={() => setShowHelp(false)} // Ẩn tooltip khi chuột rời đi
            >
              <HelpCircle size={16} /> {/* Icon trợ giúp */}
            </button>

            {/* Nội dung tooltip trợ giúp */}
            {showHelp && (
              <div className="absolute bottom-8 left-0 bg-white p-2 rounded shadow-md w-48 text-xs">
                Di chuyển chuột để tô theo chữ mờ. Hãy cố gắng tô hết chữ để nhận phần thưởng!
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Chế độ Xem Modal (phóng to) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          {/* Nội dung modal */}
          <div className="bg-white p-4 rounded-lg w-3/4 h-3/4 relative">
            {/* Nút Đóng modal */}
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600"
              onClick={() => setShowModal(false)} // Cập nhật state để đóng modal
            >
              <XCircle /> {/* Icon đóng */}
            </button>

            <h2 className="text-xl mb-4 text-center">Thực hành viết chữ</h2>

            {/* Container cho canvas trong modal */}
            <div className="border border-blue-400 rounded overflow-hidden">
              {/* Thẻ canvas trong modal */}
              <canvas
                ref={modalCanvasRef} // Gắn ref cho canvas modal
                width={1200} // Chiều rộng modal canvas
                height={400} // Chiều cao modal canvas
                className="cursor-none w-full h-full" // Ẩn con trỏ chuột, thiết lập kích thước 100%
                onMouseDown={startDrawing}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDrawing}
                onMouseLeave={handleMouseLeave}
              />
            </div>

            {/* Hiển thị tỷ lệ hoàn thành và nút Đặt lại trong modal */}
            <div className="flex justify-between items-center mt-2">
              <div className="bg-blue-100 p-2 rounded">
                {Math.round(completionPercentage)}% hoàn thành
              </div>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600"
                onClick={resetCanvas}
              >
                <RotateCcw size={16} />
                Tô lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Hiệu ứng Ăn mừng --- */}
      {/* Hiển thị khi hoàn thành ở mức cao */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-20">
          <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-2xl font-bold text-yellow-500 animate-bounce">
              Tuyệt vời! Bạn đã hoàn thành!
            </div>
            {/* Các div nhỏ tạo hiệu ứng pháo hoa */}
            <div className="fireworks">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-4 h-4 rounded-full bg-yellow-400"
                  style={{
                    left: `${Math.random() * 100}%`, // Vị trí ngẫu nhiên
                    top: `${Math.random() * 100}%`, // Vị trí ngẫu nhiên
                    animation: `firework ${1 + Math.random() * 2}s ease-out forwards`, // Animation ngẫu nhiên
                    animationDelay: `${Math.random() * 0.5}s`, // Độ trễ animation ngẫu nhiên
                    backgroundColor: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'][Math.floor(Math.random() * 6)] // Màu ngẫu nhiên
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- CSS Styles (Sử dụng styled-jsx) --- */}
      {/* Định nghĩa keyframes cho hiệu ứng pháo hoa */}
      <style jsx>{`
        @keyframes firework {
          0% {
            transform: translate(0, 0);
            opacity: 1;
            width: 4px;
            height: 4px;
          }
          100% {
            transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px);
            opacity: 0;
            width: 0px;
            height: 0px;
          }
        }
      `}</style>
    </div>
  );
};

export default LetterTracingApp;