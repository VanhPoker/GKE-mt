// src/components/AlphabetTracerReact.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Định nghĩa kiểu dữ liệu
interface Point {
    x: number;
    y: number;
}

interface LetterDefinition {
    character: string;
    strokes: Point[][];
}

// Dữ liệu chữ cái
const ALPHABET_DATA: LetterDefinition[] = [
    {
        character: "A",
        strokes: [
            [{ x: 200, y: 50 }, { x: 100, y: 350 }],
            [{ x: 200, y: 50 }, { x: 300, y: 350 }],
            [{ x: 130, y: 200 }, { x: 270, y: 200 }],
        ]
    },
    {
        character: "B",
        strokes: [
            [{ x: 100, y: 50 }, { x: 100, y: 350 }],
            [{ x: 100, y: 50 }, { x: 250, y: 50 }, {x: 280, y: 100}, { x: 250, y: 180 }, { x: 100, y: 180 } ], // Đường cong trên (đơn giản hóa)
            [{ x: 100, y: 180 }, { x: 260, y: 180 }, {x: 290, y: 250}, { x: 260, y: 350 }, { x: 100, y: 350 } ], // Đường cong dưới (đơn giản hóa)
        ]
    },
    {
        character: "L",
        strokes: [
            [{ x: 100, y: 50 }, { x: 100, y: 350 }],
            [{ x: 100, y: 350 }, { x: 300, y: 350 }],
        ]
    },
    // Thêm các chữ cái khác...
];

// Hằng số cho việc vẽ và kiểm tra
const GUIDE_DOT_COLOR = 'rgba(180, 180, 180, 0.9)';
const GUIDE_DOT_RADIUS = 7;
const ACTIVE_GUIDE_DOT_COLOR = 'orange';
const ACTIVE_GUIDE_DOT_RADIUS = 9;
const TRACED_LINE_FILL_COLOR = 'rgba(0, 180, 0, 0.5)'; // Màu fill khi hoàn thành đoạn
const USER_LINE_COLOR = 'rgba(60, 60, 255, 0.7)';
const LETTER_OUTLINE_COLOR = 'rgba(220, 220, 220, 0.8)'; // Màu chữ mờ
const USER_LINE_WIDTH = 30; // Giảm độ dày nét vẽ của người dùng một chút
const OUTLINE_LINE_WIDTH = 45; // Độ dày của chữ mờ (cũng là độ dày của fill)
const HIT_TOLERANCE = 28;
const START_TOLERANCE = 40;

// Hằng số cho theme vở ô ly
const OLI_GRID_COLOR_LIGHT = '#d1e9ff'; // Màu lưới ô ly nhạt (hơi xanh)
const OLI_GRID_COLOR_DARKER = '#a8d8ff'; // Màu lưới ô ly đậm hơn
const OLI_MARGIN_LINE_COLOR = '#ffacac'; // Màu đường lề vở
const OLI_GRID_SIZE = 20; // Kích thước mỗi ô vuông nhỏ

const AlphabetTracerReactComponent: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    const [currentAlphabetIndex, setCurrentAlphabetIndex] = useState<number>(0);
    const [currentLetterDef, setCurrentLetterDef] = useState<LetterDefinition | null>(ALPHABET_DATA[0]);
    
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const userCurrentStrokePointsRef = useRef<Point[]>([]); 
    const [completedStrokesData, setCompletedStrokesData] = useState<Point[][]>([]);

    const [currentStrokeIndex, setCurrentStrokeIndex] = useState<number>(0);
    const [nextExpectedPointIndex, setNextExpectedPointIndex] = useState<number>(0);

    const [message, setMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

    // --- HÀM VẼ LƯỚI Ô LY ---
    const drawOliGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.save();
        ctx.strokeStyle = OLI_GRID_COLOR_LIGHT;
        ctx.lineWidth = 0.7; // Nét mảnh hơn cho lưới phụ

        // Vẽ các đường lưới dọc phụ
        for (let x = 0; x <= width; x += OLI_GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        // Vẽ các đường lưới ngang phụ
        for (let y = 0; y <= height; y += OLI_GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vẽ các đường kẻ ngang chính (đậm hơn) - giống dòng kẻ vở
        ctx.strokeStyle = OLI_GRID_COLOR_DARKER;
        ctx.lineWidth = 1;
        // Giả sử chiều cao canvas là 400, gridSize là 20.
        // Chúng ta muốn các dòng kẻ chính ví dụ ở y = 40, 120, 200, 280, 360 (cách nhau 4 ô)
        // Hoặc mỗi 5 ô: y = 100, 200, 300
        for (let y = 0; y <= height; y += (OLI_GRID_SIZE * 4)) { // Mỗi 4 ô nhỏ (80px)
            if (y === 0 && height > 0) continue; // Bỏ qua đường y=0 nếu nó trùng viền
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Vẽ đường kẻ lề dọc màu đỏ/hồng
        const marginLineX1 = OLI_GRID_SIZE * 2; // Vị trí đường lề thứ nhất (mỏng hơn)
        const marginLineX2 = OLI_GRID_SIZE * 2 + 2; // Đường lề thứ hai (sát đường thứ nhất)
        
        ctx.strokeStyle = OLI_MARGIN_LINE_COLOR;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(marginLineX1, 0);
        ctx.lineTo(marginLineX1, height);
        ctx.stroke();

        // Nếu muốn 2 đường lề sát nhau như một số vở
        // ctx.beginPath();
        // ctx.moveTo(marginLineX2, 0);
        // ctx.lineTo(marginLineX2, height);
        // ctx.stroke();

        ctx.restore();
    }, []);

    // --- HÀM VẼ CHÍNH ---
    const drawScene = useCallback(() => {
        const ctx = canvasCtxRef.current;
        if (!ctx || !canvasRef.current || !currentLetterDef) return;

        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 1. VẼ LƯỚI Ô LY ĐẦU TIÊN
        drawOliGrid(ctx, canvasWidth, canvasHeight);

        // 2. Vẽ nền chữ cái (mờ)
        ctx.save();
        ctx.strokeStyle = LETTER_OUTLINE_COLOR;
        ctx.lineWidth = OUTLINE_LINE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        currentLetterDef.strokes.forEach(strokePoints => {
            if (strokePoints.length < 1) return;
            ctx.beginPath();
            ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
            for (let i = 1; i < strokePoints.length; i++) {
                ctx.lineTo(strokePoints[i].x, strokePoints[i].y);
            }
            if (strokePoints.length === 1) {
                 ctx.arc(strokePoints[0].x, strokePoints[0].y, OUTLINE_LINE_WIDTH / 2, 0, Math.PI * 2);
                 ctx.fillStyle = LETTER_OUTLINE_COLOR; // Chữ mờ nên dùng fillStyle thay vì strokeStyle cho chấm
                 ctx.fill();
            } else {
                ctx.stroke();
            }
        });
        ctx.restore();

        // 3. Vẽ các nét đã hoàn thành bởi người dùng (FILL bằng đường dày)
        ctx.save();
        completedStrokesData.forEach(strokePoints => {
            if (strokePoints.length < 1) return;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            // Sử dụng màu TRACED_LINE_FILL_COLOR với độ dày lớn để "fill"
            ctx.strokeStyle = TRACED_LINE_FILL_COLOR; 
            ctx.lineWidth = OUTLINE_LINE_WIDTH * 0.95; // Độ dày gần bằng chữ mờ

            ctx.beginPath();
            ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
            for (let i = 1; i < strokePoints.length; i++) {
                ctx.lineTo(strokePoints[i].x, strokePoints[i].y);
            }
            if (strokePoints.length === 1) { // Nếu là một điểm (ví dụ hoàn thành 1 điểm của nét)
                ctx.fillStyle = TRACED_LINE_FILL_COLOR;
                ctx.arc(strokePoints[0].x, strokePoints[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
                ctx.fill();
           } else { // Nếu là đoạn thẳng
               ctx.stroke();
           }
        });
        ctx.restore();

        // 4. Vẽ nét người dùng đang thực hiện (nếu có)
        ctx.save();
        if (userCurrentStrokePointsRef.current.length > 0) {
            const points = userCurrentStrokePointsRef.current;
            ctx.strokeStyle = USER_LINE_COLOR;
            ctx.lineWidth = USER_LINE_WIDTH; // Nét細 hơn khi đang vẽ
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
             if (points.length === 1) {
                 ctx.arc(points[0].x, points[0].y, USER_LINE_WIDTH / 2, 0, Math.PI * 2);
                 ctx.fillStyle = USER_LINE_COLOR;
                 ctx.fill();
            } else {
                ctx.stroke();
            }
        }
        ctx.restore();
        
        // 5. Vẽ các điểm hướng dẫn
        ctx.save();
        if (currentLetterDef && currentStrokeIndex < currentLetterDef.strokes.length) {
            const currentStrokeGuidePoints = currentLetterDef.strokes[currentStrokeIndex];
            if (currentStrokeGuidePoints) {
                currentStrokeGuidePoints.forEach((point, index) => {
                    ctx.beginPath();
                    const isActivePoint = index === nextExpectedPointIndex;
                    const radius = isActivePoint ? ACTIVE_GUIDE_DOT_RADIUS : GUIDE_DOT_RADIUS;
                    let color = isActivePoint ? ACTIVE_GUIDE_DOT_COLOR : GUIDE_DOT_COLOR;
                    // Nếu điểm đã được "qua" trong nét hiện tại (trước nextExpectedPointIndex)
                    if (index < nextExpectedPointIndex) {
                        color = 'rgba(120, 220, 120, 0.8)'; // Màu xanh lá nhạt cho điểm đã qua
                    }
                    
                    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();

                    // Vẽ số thứ tự điểm
                    ctx.fillStyle = "black";
                    ctx.font = `${radius * 1}px Arial`; // Kích thước font cho số
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText((index + 1).toString(), point.x, point.y);
                });
            }
        }
        ctx.restore();

    }, [currentLetterDef, completedStrokesData, currentStrokeIndex, nextExpectedPointIndex, drawOliGrid]);

    // useEffect để khởi tạo context canvas
    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            canvasCtxRef.current = ctx;
            // Đảm bảo vẽ lần đầu khi context sẵn sàng và currentLetterDef đã có
            if (currentLetterDef) {
                drawScene();
            }
        }
    }, [currentLetterDef]); // Thêm currentLetterDef để đảm bảo vẽ khi nó được load lần đầu

    // useEffect để vẽ lại khi các dependencies thay đổi
    useEffect(() => {
        drawScene();
    }, [drawScene]); // drawScene đã bao gồm các dependencies cần thiết

    const loadLetter = useCallback((index: number) => {
        if (index < 0 || index >= ALPHABET_DATA.length) return;
        setCurrentAlphabetIndex(index);
        setCurrentLetterDef(ALPHABET_DATA[index]); // Sẽ trigger useEffect ở trên để vẽ
        setCurrentStrokeIndex(0);
        setNextExpectedPointIndex(0);
        userCurrentStrokePointsRef.current = [];
        setCompletedStrokesData([]);
        setIsDrawing(false);
        setMessage(null);
    }, []); // Không cần drawScene ở đây nữa

    useEffect(() => {
        loadLetter(currentAlphabetIndex);
    }, [currentAlphabetIndex, loadLetter]);


    const getMouseOrTouchPos = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
        // ... (giữ nguyên)
        if (!canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        let clientX: number, clientY: number;

        if ('touches' in event) { 
            if (event.touches.length > 0) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else if (event.changedTouches.length > 0) { 
                clientX = event.changedTouches[0].clientX;
                clientY = event.changedTouches[0].clientY;
            } else { return null; }
        } else { 
            clientX = event.clientX;
            clientY = event.clientY;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const distance = (p1: Point, p2: Point): number => {
        // ... (giữ nguyên)
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    };

    const handleDrawingStart = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        // ... (logic giữ nguyên, nhưng gọi drawScene() ở cuối nếu cần cập nhật ngay)
        event.preventDefault();
        if (!currentLetterDef || currentStrokeIndex >= currentLetterDef.strokes.length) return;

        const pos = getMouseOrTouchPos(event);
        if (!pos) return;

        const currentStrokeGuidePoints = currentLetterDef.strokes[currentStrokeIndex];
        if (!currentStrokeGuidePoints || currentStrokeGuidePoints.length === 0) return;
        
        const targetPoint = currentStrokeGuidePoints[nextExpectedPointIndex];
        const tolerance = nextExpectedPointIndex === 0 ? START_TOLERANCE : HIT_TOLERANCE;

        if (distance(pos, targetPoint) < tolerance) {
            setIsDrawing(true);
            userCurrentStrokePointsRef.current = [pos]; 
            // Không cần drawScene() ở đây vì handleDrawingMove sẽ gọi
        }
    };

    const handleDrawingMove = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        // ... (logic giữ nguyên)
        if (!isDrawing || !currentLetterDef) return;
        event.preventDefault();
        const pos = getMouseOrTouchPos(event);
        if (!pos) return;

        userCurrentStrokePointsRef.current.push(pos);

        const currentStrokeGuidePoints = currentLetterDef.strokes[currentStrokeIndex];
        // Kiểm tra xem có điểm target không, nếu không (đã hoàn thành nét trước đó) thì không làm gì
        if (nextExpectedPointIndex >= currentStrokeGuidePoints.length) {
             // Có thể xảy ra nếu người dùng vẫn kéo chuột sau khi hoàn thành nét cuối
             // và isDrawing chưa kịp set về false.
            return;
        }
        const targetPoint = currentStrokeGuidePoints[nextExpectedPointIndex];


        if (distance(pos, targetPoint) < HIT_TOLERANCE) {
            // Tạo một "đoạn" hoàn chỉnh từ điểm guide trước đó đến điểm target hiện tại
            // hoặc từ điểm bắt đầu vẽ của người dùng đến điểm target nếu đây là điểm đầu tiên của nét
            let segmentToComplete: Point[];
            if (nextExpectedPointIndex > 0) {
                segmentToComplete = [currentStrokeGuidePoints[nextExpectedPointIndex - 1], targetPoint];
            } else {
                // Nếu là điểm đầu tiên của nét, thì đoạn hoàn thành là từ điểm bắt đầu của người dùng (đã snap) đến target
                // Hoặc đơn giản là chỉ cần 1 điểm nếu nét chỉ có 1 điểm
                segmentToComplete = [targetPoint]; // Hoặc [userCurrentStrokePointsRef.current[0], targetPoint] nếu muốn đoạn từ lúc nhấn chuột
                                                   // Hiện tại, cách này sẽ fill từng "chấm" một khi chạm
            }
             // Thay vì push userCurrentStrokePointsRef, chúng ta push đoạn thẳng giữa 2 guide points
            // Điều này đảm bảo đường fill luôn thẳng theo guide
            const prevGuidePoint = nextExpectedPointIndex > 0 ? currentStrokeGuidePoints[nextExpectedPointIndex - 1] : userCurrentStrokePointsRef.current[0] || targetPoint;


            setCompletedStrokesData(prev => [...prev, [prevGuidePoint, targetPoint]]);
            userCurrentStrokePointsRef.current = [targetPoint]; // Bắt đầu nét vẽ mới từ điểm target này

            setNextExpectedPointIndex(prev => prev + 1);

            // (Logic kiểm tra hoàn thành nét và hoàn thành chữ giữ nguyên)
            if (nextExpectedPointIndex + 1 >= currentStrokeGuidePoints.length) { 
                // Không cần thêm vào completedStrokesData lần nữa ở đây vì đã thêm từng đoạn
                userCurrentStrokePointsRef.current = [];
                setIsDrawing(false); 
                setCurrentStrokeIndex(prev => prev + 1);
                setNextExpectedPointIndex(0); 

                if (currentStrokeIndex + 1 >= currentLetterDef.strokes.length) { 
                    setMessage({ text: "Tuyệt vời!", type: 'success' });
                    setTimeout(() => {
                        const nextIdx = (currentAlphabetIndex + 1) % ALPHABET_DATA.length;
                        loadLetter(nextIdx);
                    }, 1500);
                }
            }
        }
        // Vẫn gọi drawScene để cập nhật nét vẽ hiện tại của người dùng (USER_LINE_COLOR)
        drawScene();
    };

    const handleDrawingEnd = () => {
        // ... (logic giữ nguyên)
        if (!isDrawing) return;
        
        if (currentLetterDef) {
            const currentStrokeGuidePoints = currentLetterDef.strokes[currentStrokeIndex];
            if (currentStrokeGuidePoints && nextExpectedPointIndex < currentStrokeGuidePoints.length) {
                 userCurrentStrokePointsRef.current = [];
            }
        }
        setIsDrawing(false);
        drawScene(); 
    };

    const handleNextLetter = () => { /* ... (giữ nguyên) ... */ 
        const nextIdx = (currentAlphabetIndex + 1) % ALPHABET_DATA.length;
        loadLetter(nextIdx);
    };
    const handlePrevLetter = () => { /* ... (giữ nguyên) ... */ 
        const prevIdx = (currentAlphabetIndex - 1 + ALPHABET_DATA.length) % ALPHABET_DATA.length;
        loadLetter(prevIdx);
    };
    const handleResetLetter = () => { /* ... (giữ nguyên) ... */ 
        loadLetter(currentAlphabetIndex);
    };
    const handleSelectLetter = (char: string) => { /* ... (giữ nguyên) ... */ 
        const index = ALPHABET_DATA.findIndex(def => def.character === char);
        if (index !== -1) {
            loadLetter(index);
        }
    };

    // --- JSX ---
    return (
        // Thay đổi màu nền container chính nếu muốn
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-xl select-none w-full max-w-2xl mx-auto border-2 border-gray-200">
            <h1 className="text-5xl sm:text-6xl font-bold text-slate-700 mb-6">
                {currentLetterDef?.character || ''}
            </h1>

            {/* Container của canvas không cần style nền đặc biệt nữa vì canvas sẽ vẽ lưới */}
            <div className="relative p-0 rounded-lg shadow-inner"> {/* Bỏ padding nếu muốn lưới sát viền */}
                <canvas
                    ref={canvasRef}
                    width={400} // Đảm bảo kích thước này phù hợp với OLI_GRID_SIZE
                    height={400} // Ví dụ: 400 = OLI_GRID_SIZE (20) * 20
                    className="cursor-crosshair rounded-md" // Có thể bỏ border của canvas nếu lưới đã rõ
                    onMouseDown={handleDrawingStart}
                    onMouseMove={handleDrawingMove}
                    onMouseUp={handleDrawingEnd}
                    onMouseLeave={handleDrawingEnd}
                    onTouchStart={handleDrawingStart}
                    onTouchMove={handleDrawingMove}
                    onTouchEnd={handleDrawingEnd}
                    onTouchCancel={handleDrawingEnd}
                />
                {message && (
                    <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl sm:text-2xl font-bold shadow-lg p-3 sm:p-4 rounded-md z-10 
                                    ${message.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* Các nút điều khiển và chọn chữ cái giữ nguyên */}
            <div className="mt-8 flex space-x-2 sm:space-x-4">
                <button onClick={handlePrevLetter} className="px-4 py-2 sm:px-6 sm:py-3 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400">Trước</button>
                <button onClick={handleResetLetter} className="px-4 py-2 sm:px-6 sm:py-3 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400">Xóa</button>
                <button onClick={handleNextLetter} className="px-4 py-2 sm:px-6 sm:py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400">Sau</button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md sm:max-w-lg">
                {ALPHABET_DATA.map(letter => (
                    <button key={letter.character} onClick={() => handleSelectLetter(letter.character)} className={`w-10 h-10 sm:w-12 sm:h-12 font-bold text-xl rounded-md shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${currentLetterDef?.character === letter.character ? 'bg-blue-500 text-white' : 'bg-white text-blue-600 hover:bg-blue-100'}`}>{letter.character}</button>
                ))}
            </div>
        </div>
    );
};

export default AlphabetTracerReactComponent;