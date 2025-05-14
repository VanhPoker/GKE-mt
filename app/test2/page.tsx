// src/components/AlphabetTracerReact.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Định nghĩa kiểu dữ liệu (giữ nguyên)
interface Point {
    x: number;
    y: number;
}

interface LetterDefinition {
    character: string;
    strokes: Point[][];
}

// Dữ liệu chữ cái (CẬP NHẬT CHỮ 'a' VỚI NHIỀU NÉT HƠN)
const ALPHABET_DATA: LetterDefinition[] = [
    {
        character: "A",
        strokes: [
            [{ x: 200, y: 50 }, { x: 175, y: 125 }, { x: 150, y: 200 }, { x: 125, y: 275 }, { x: 100, y: 350 }],
            [{ x: 200, y: 50 }, { x: 225, y: 125 }, { x: 250, y: 200 }, { x: 275, y: 275 }, { x: 300, y: 350 }],
            [{ x: 130, y: 200 }, { x: 165, y: 200 }, { x: 200, y: 200 }, { x: 235, y: 200 }, { x: 270, y: 200 }],
        ]
    },
    {
        character: "B", // Bạn có thể thêm nhiều điểm cho B tương tự nếu muốn
        strokes: [
            [{ x: 100, y: 50 }, { x: 100, y: 110 }, { x: 100, y: 170 }, { x: 100, y: 230 }, { x: 100, y: 290 }, { x: 100, y: 350 }],
            [{ x: 100, y: 50 }, { x: 160, y: 50 }, { x: 210, y: 60 }, { x: 240, y: 90 }, { x: 240, y: 130 }, { x: 210, y: 160 }, { x: 160, y: 170 }, { x: 100, y: 170 } ],
            [{ x: 100, y: 170 }, { x: 170, y: 170 }, { x: 230, y: 190 }, { x: 260, y: 230 }, { x: 260, y: 280 }, { x: 230, y: 320 }, { x: 170, y: 350 }, { x: 100, y: 350 } ],
        ]
    },
    {
        character: "a", // Chữ 'a' viết thường với nhiều chi tiết hơn
        strokes: [
            // Nét 1: Phần thân tròn của chữ 'a'
            [
                { x: 250, y: 180 }, // 1. Bắt đầu (khoảng 2 giờ)
                { x: 235, y: 160 },
                { x: 215, y: 148 }, // Đỉnh trên
                { x: 190, y: 150 },
                { x: 170, y: 165 },
                { x: 150, y: 190 }, // Bên trái nhất, ngang giữa
                { x: 140, y: 220 },
                { x: 135, y: 250 }, // Điểm thấp nhất bên trái
                { x: 145, y: 280 },
                { x: 170, y: 305 },
                { x: 200, y: 315 }, // Đáy của chữ 'a'
                { x: 230, y: 305 },
                { x: 255, y: 280 },
                { x: 268, y: 250 }, // Bên phải nhất, ngang giữa (điểm nối với nét 2)
                { x: 265, y: 215 },
                { x: 250, y: 180 }  // Kết thúc, khép vòng
            ],
            // Nét 2: Nét thẳng đứng bên phải
            [
                { x: 268, y: 170 }, // Bắt đầu từ trên, hơi cao hơn điểm bắt đầu nét 1 một chút
                { x: 268, y: 200 },
                { x: 268, y: 230 },
                { x: 268, y: 260 }, // Chạm vào thân (điểm 14 của nét 1)
                { x: 270, y: 290 },
                { x: 275, y: 315 }  // Kết thúc, có thể hơi đá ra
            ]
        ]
    },
    {
        character: "L",
        strokes: [
            [{ x: 100, y: 50 }, { x: 100, y: 110 }, { x: 100, y: 170 }, { x: 100, y: 230 }, { x: 100, y: 290 }, { x: 100, y: 350 }],
            [{ x: 100, y: 350 }, { x: 150, y: 350 }, { x: 200, y: 350 }, { x: 250, y: 350 }, { x: 300, y: 350 }],
        ]
    },
];

// Hằng số
const GUIDE_DOT_COLOR = 'rgba(180, 180, 180, 0.9)';
const GUIDE_DOT_RADIUS = 7;
const ACTIVE_GUIDE_DOT_COLOR = 'orange';
const ACTIVE_GUIDE_DOT_RADIUS = 9;
const INITIAL_ACTIVE_GUIDE_DOT_RADIUS = 12; 
const COMPLETED_GUIDE_DOT_COLOR = 'rgba(120, 220, 120, 0.8)';
const TRACED_LINE_FILL_COLOR = 'rgba(0, 180, 0, 0.5)';
const USER_LINE_COLOR = 'rgba(60, 60, 255, 0.7)';
const LETTER_OUTLINE_COLOR = 'rgba(220, 220, 220, 0.7)';
const DASHED_LINE_COLOR = 'rgba(130, 130, 130, 0.9)'; 
const DASHED_LINE_WIDTH = 3;
const USER_LINE_WIDTH = 30;
const OUTLINE_LINE_WIDTH = 45;
const FINAL_COMPLETED_LETTER_COLOR = 'rgba(0, 60, 120, 0.85)'; // Màu đậm khi hoàn thành cả chữ
const HIT_TOLERANCE = 28;
const START_TOLERANCE = 40;
const STRAY_TOLERANCE = 30;

const OLI_GRID_COLOR_LIGHT = '#d1e9ff';
// ... (các hằng số ô ly khác giữ nguyên)
const OLI_GRID_COLOR_DARKER = '#a8d8ff';
const OLI_MARGIN_LINE_COLOR = '#ffacac';
const OLI_GRID_SIZE = 20;


interface Toast { id: number; text: string; type: 'success' | 'info' | 'error'; }
function sqr(x: number) { return x * x }
function distSquared(p1: Point, p2: Point) { return sqr(p1.x - p2.x) + sqr(p1.y - p2.y) }
function distanceToLineSegment(p: Point, v: Point, w: Point): number {
  const l2 = distSquared(v, w);
  if (l2 === 0) return Math.sqrt(distSquared(p, v));
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
  return Math.sqrt(distSquared(p, projection));
}

const AlphabetTracerReactComponent: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    const [currentAlphabetIndex, setCurrentAlphabetIndex] = useState<number>(0);
    const [currentLetterDef, setCurrentLetterDef] = useState<LetterDefinition | null>(null);
    
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const userCurrentStrokePointsRef = useRef<Point[]>([]); 
    const [completedStrokeSegments, setCompletedStrokeSegments] = useState<Point[][]>([]);

    const [currentStrokeIndex, setCurrentStrokeIndex] = useState<number>(0);
    const [nextExpectedPointIndex, setNextExpectedPointIndex] = useState<number>(0);
    
    const [isLetterFullyCompleted, setIsLetterFullyCompleted] = useState<boolean>(false); // State mới

    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdCounter = useRef(0);

    const addToast = useCallback((text: string, type: Toast['type'], duration: number = 3000) => {
        const id = toastIdCounter.current++;
        setToasts(prevToasts => [...prevToasts, { id, text, type }]);
        setTimeout(() => { removeToast(id); }, duration);
    }, []); // removeToast sẽ được định nghĩa sau và cần là dependency nếu nó thay đổi

    const removeToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);
    
    // Thêm removeToast vào dependency của addToast
    useEffect(() => {
        // Nạp lại addToast nếu removeToast thay đổi (mặc dù removeToast cũng nên được useCallback)
    }, [removeToast]);


    const drawOliGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        // ... (logic vẽ lưới giữ nguyên)
        ctx.save();
        ctx.strokeStyle = OLI_GRID_COLOR_LIGHT;
        ctx.lineWidth = 0.7;
        for (let x = 0; x <= width; x += OLI_GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y <= height; y += OLI_GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
        ctx.strokeStyle = OLI_GRID_COLOR_DARKER;
        ctx.lineWidth = 1;
        for (let y = OLI_GRID_SIZE * 4; y <= height; y += (OLI_GRID_SIZE * 4)) { 
            if (y === 0 && height > 0) continue;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
        const marginLineX1 = OLI_GRID_SIZE * 2;
        ctx.strokeStyle = OLI_MARGIN_LINE_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(marginLineX1, 0); ctx.lineTo(marginLineX1, height); ctx.stroke();
        ctx.restore();
    }, []);

    const drawScene = useCallback(() => {
        const ctx = canvasCtxRef.current;
        if (!ctx || !canvasRef.current) return;
        
        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawOliGrid(ctx, canvasWidth, canvasHeight);

        if (!currentLetterDef) return;

        if (isLetterFullyCompleted) {
            // Vẽ chữ đã hoàn thành bằng màu đậm
            ctx.save();
            ctx.strokeStyle = FINAL_COMPLETED_LETTER_COLOR;
            ctx.lineWidth = OUTLINE_LINE_WIDTH; // Dùng độ dày lớn
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            currentLetterDef.strokes.forEach(strokePoints => {
                if (strokePoints.length < 1) return;
                ctx.beginPath();
                ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
                for (let i = 1; i < strokePoints.length; i++) ctx.lineTo(strokePoints[i].x, strokePoints[i].y);
                if (strokePoints.length === 1) { // Chấm
                     ctx.arc(strokePoints[0].x, strokePoints[0].y, OUTLINE_LINE_WIDTH / 2, 0, Math.PI * 2);
                     ctx.fillStyle = FINAL_COMPLETED_LETTER_COLOR; ctx.fill();
                } else ctx.stroke();
            });
            ctx.restore();
            return; // Không vẽ gì thêm nếu chữ đã hoàn thành
        }

        // 2. VẼ TOÀN BỘ CHỮ CÁI MỜ (NỀN)
        ctx.save();
        // ... (logic vẽ nền chữ mờ như cũ)
        ctx.strokeStyle = LETTER_OUTLINE_COLOR;
        ctx.lineWidth = OUTLINE_LINE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        currentLetterDef.strokes.forEach(strokePoints => {
            if (strokePoints.length < 1) return;
            ctx.beginPath();
            ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
            for (let i = 1; i < strokePoints.length; i++) ctx.lineTo(strokePoints[i].x, strokePoints[i].y);
            if (strokePoints.length === 1) {
                 ctx.arc(strokePoints[0].x, strokePoints[0].y, OUTLINE_LINE_WIDTH / 2, 0, Math.PI * 2);
                 ctx.fillStyle = LETTER_OUTLINE_COLOR; ctx.fill();
            } else ctx.stroke();
        });
        ctx.restore();

        // 3. VẼ ĐƯỜNG NÉT ĐỨT CHO NÉT HIỆN TẠI
        ctx.save();
        // ... (logic vẽ nét đứt như cũ)
        if (currentStrokeIndex < currentLetterDef.strokes.length) {
            const strokeToTrace = currentLetterDef.strokes[currentStrokeIndex];
            if (strokeToTrace && strokeToTrace.length > 0) {
                ctx.strokeStyle = DASHED_LINE_COLOR; ctx.lineWidth = DASHED_LINE_WIDTH;
                ctx.setLineDash([8, 6]); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath(); ctx.moveTo(strokeToTrace[0].x, strokeToTrace[0].y);
                for (let i = 1; i < strokeToTrace.length; i++) ctx.lineTo(strokeToTrace[i].x, strokeToTrace[i].y);
                ctx.stroke(); ctx.setLineDash([]);
            }
        }
        ctx.restore();

        // 4. Vẽ CÁC ĐOẠN ĐÃ HOÀN THÀNH (FILL)
        ctx.save();
        // ... (logic vẽ fill như cũ)
        completedStrokeSegments.forEach(segment => {
            if (segment.length < 2) return;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.strokeStyle = TRACED_LINE_FILL_COLOR; ctx.lineWidth = OUTLINE_LINE_WIDTH * 0.95;
            ctx.beginPath(); ctx.moveTo(segment[0].x, segment[0].y); ctx.lineTo(segment[1].x, segment[1].y);
            ctx.stroke();
        });
        ctx.restore();

        // 5. Vẽ NÉT NGƯỜI DÙNG ĐANG TÔ
        ctx.save();
        // ... (logic vẽ nét đang tô như cũ)
        if (isDrawing && userCurrentStrokePointsRef.current.length > 0) {
            const points = userCurrentStrokePointsRef.current;
            ctx.strokeStyle = USER_LINE_COLOR; ctx.lineWidth = USER_LINE_WIDTH;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            if (points.length === 1) {
                 ctx.arc(points[0].x, points[0].y, USER_LINE_WIDTH / 2, 0, Math.PI * 2);
                 ctx.fillStyle = USER_LINE_COLOR; ctx.fill();
            } else ctx.stroke();
        }
        ctx.restore();
        
        // 6. Vẽ CÁC ĐIỂM GUIDE (VỚI LOGIC ĐÁNH SỐ MỚI)
        ctx.save();
        if (currentLetterDef && currentStrokeIndex < currentLetterDef.strokes.length) {
            const guidePoints = currentLetterDef.strokes[currentStrokeIndex];
            if (guidePoints) {
                guidePoints.forEach((point, index) => {
                    ctx.beginPath();
                    const isActive = index === nextExpectedPointIndex;
                    const isCompletedInCurrentStroke = index < nextExpectedPointIndex;
                    
                    let radius = GUIDE_DOT_RADIUS;
                    if (isActive) {
                        radius = (nextExpectedPointIndex === 0) ? INITIAL_ACTIVE_GUIDE_DOT_RADIUS : ACTIVE_GUIDE_DOT_RADIUS;
                    }
                    
                    let color = GUIDE_DOT_COLOR;
                    if (isActive) color = ACTIVE_GUIDE_DOT_COLOR;
                    else if (isCompletedInCurrentStroke) color = COMPLETED_GUIDE_DOT_COLOR;
                    
                    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); 
                    ctx.fillStyle = color; 
                    ctx.fill();

                    // Logic đánh số mới
                    let pointNumberText = "";
                    if (index === 0) { // Điểm đầu tiên của nét hiện tại
                        pointNumberText = (currentStrokeIndex * 2 + 1).toString();
                    } else if (index === guidePoints.length - 1) { // Điểm cuối cùng của nét hiện tại
                        pointNumberText = (currentStrokeIndex * 2 + 2).toString();
                    }

                    if (pointNumberText) {
                        ctx.fillStyle = "black"; 
                        ctx.font = `${Math.max(radius * 0.7, 9)}px Arial`; // Đảm bảo font không quá nhỏ
                        ctx.textAlign = 'center'; 
                        ctx.textBaseline = 'middle';
                        ctx.fillText(pointNumberText, point.x, point.y);
                    }
                });
            }
        }
        ctx.restore();
    }, [currentLetterDef, completedStrokeSegments, currentStrokeIndex, nextExpectedPointIndex, drawOliGrid, isDrawing, isLetterFullyCompleted]); // Thêm isLetterFullyCompleted
    
    const loadLetter = useCallback((index: number) => {
        if (index < 0 || index >= ALPHABET_DATA.length) {
             console.warn("LoadLetter: Invalid letter index:", index); return;
        }
        setCurrentAlphabetIndex(index); 
        setCurrentLetterDef(ALPHABET_DATA[index]); 
        setCurrentStrokeIndex(0);
        setNextExpectedPointIndex(0);
        userCurrentStrokePointsRef.current = [];
        setCompletedStrokeSegments([]);
        setIsDrawing(false);
        setIsLetterFullyCompleted(false); // Reset trạng thái hoàn thành chữ
        setToasts([]); 
    }, [setToasts]); 

    useEffect(() => {
        if (canvasRef.current && !canvasCtxRef.current) {
            canvasCtxRef.current = canvasRef.current.getContext('2d');
        }
        if (canvasCtxRef.current) {
            loadLetter(currentAlphabetIndex);
        }
    }, [currentAlphabetIndex, loadLetter]);

    useEffect(() => {
        if (canvasCtxRef.current) {
            drawScene();
        }
    }, [drawScene]);


    const getMouseOrTouchPos = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => { /* ... (giữ nguyên) ... */ 
        if (!canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        let clientX: number, clientY: number;
        if ('touches' in event) { 
            clientX = event.touches.length > 0 ? event.touches[0].clientX : (event.changedTouches.length > 0 ? event.changedTouches[0].clientX : 0);
            clientY = event.touches.length > 0 ? event.touches[0].clientY : (event.changedTouches.length > 0 ? event.changedTouches[0].clientY : 0);
        } else { 
            clientX = event.clientX;
            clientY = event.clientY;
        }
        if(clientX === 0 && clientY === 0 && !('touches' in event && (event.touches.length > 0 || event.changedTouches.length > 0))) return null;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }, []);
    
    const handleDrawingStart = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => { /* ... (giữ nguyên) ... */
        event.preventDefault();
        if (isLetterFullyCompleted) return; // Không cho vẽ nếu chữ đã hoàn thành và đang chờ chuyển
        // setMessage(null); // Đã bỏ Message
        if (!currentLetterDef || currentStrokeIndex >= currentLetterDef.strokes.length) return;
        const pos = getMouseOrTouchPos(event);
        if (!pos) return;
        const currentStrokeGuidePoints = currentLetterDef.strokes[currentStrokeIndex];
        if (!currentStrokeGuidePoints || currentStrokeGuidePoints.length === 0 || nextExpectedPointIndex >= currentStrokeGuidePoints.length) return;
        const targetPoint = currentStrokeGuidePoints[nextExpectedPointIndex];
        const clickTolerance = (nextExpectedPointIndex === 0) ? Math.max(START_TOLERANCE, INITIAL_ACTIVE_GUIDE_DOT_RADIUS) : HIT_TOLERANCE;
        if (distanceToLineSegment(pos, targetPoint, targetPoint) < clickTolerance) {
            setIsDrawing(true); 
            userCurrentStrokePointsRef.current = [pos];
        }
     }, [currentLetterDef, currentStrokeIndex, nextExpectedPointIndex, getMouseOrTouchPos, isLetterFullyCompleted]); // Thêm isLetterFullyCompleted
    
    const handleDrawingMove = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !currentLetterDef || isLetterFullyCompleted) return; // Không cho vẽ nếu chữ đã hoàn thành
        event.preventDefault();
        const pos = getMouseOrTouchPos(event);
        if (!pos) return;

        const currentStrokeGuidePoints = currentLetterDef.strokes[currentStrokeIndex];
        if (!currentStrokeGuidePoints || nextExpectedPointIndex >= currentStrokeGuidePoints.length) {
            setIsDrawing(false); return;
        }
        const prevGuidePointOrUserStart = nextExpectedPointIndex === 0 
                               ? (userCurrentStrokePointsRef.current[0] || currentStrokeGuidePoints[0])
                               : currentStrokeGuidePoints[nextExpectedPointIndex - 1];
        const targetPoint = currentStrokeGuidePoints[nextExpectedPointIndex];

        const distToSegment = distanceToLineSegment(pos, prevGuidePointOrUserStart, targetPoint);
        if (distToSegment > STRAY_TOLERANCE) {
            setIsDrawing(false);
            userCurrentStrokePointsRef.current = [];
            addToast("Vẽ hơi lệch! Hãy tô lại.", 'error');
            return;
        }
        userCurrentStrokePointsRef.current.push(pos);
        let pointWasHit = false;
        if (distanceToLineSegment(pos, targetPoint, targetPoint) < HIT_TOLERANCE) {
            pointWasHit = true;
            const segmentStartPoint = nextExpectedPointIndex === 0
                                      ? (userCurrentStrokePointsRef.current[0] || targetPoint) 
                                      : currentStrokeGuidePoints[nextExpectedPointIndex - 1];
            setCompletedStrokeSegments(prev => [...prev, [segmentStartPoint, targetPoint]]);
            userCurrentStrokePointsRef.current = [targetPoint]; 
            const newNextExpectedPointIndex = nextExpectedPointIndex + 1;
            setNextExpectedPointIndex(newNextExpectedPointIndex);

            if (newNextExpectedPointIndex >= currentStrokeGuidePoints.length) { 
                userCurrentStrokePointsRef.current = []; 
                setIsDrawing(false); 
                const newCurrentStrokeIndex = currentStrokeIndex + 1;
                setCurrentStrokeIndex(newCurrentStrokeIndex);
                setNextExpectedPointIndex(0); 
                if (newCurrentStrokeIndex >= currentLetterDef.strokes.length) { 
                    addToast("Tuyệt vời! Hoàn thành chữ!", 'success');
                    setIsLetterFullyCompleted(true); // Đặt trạng thái hoàn thành chữ
                    setTimeout(() => {
                        setIsLetterFullyCompleted(false); // Reset trước khi load chữ mới
                        setCurrentAlphabetIndex(prevIdx => (prevIdx + 1) % ALPHABET_DATA.length);
                    }, 1500); // Thời gian hiển thị chữ hoàn thành trước khi chuyển
                } else {
                     addToast("Chính xác! Tiếp tục nét sau.", 'info');
                }
            }
        }
        if (!pointWasHit && isDrawing) {
            drawScene();
        }
    }, [isDrawing, currentLetterDef, currentStrokeIndex, nextExpectedPointIndex, getMouseOrTouchPos, drawScene, addToast, isLetterFullyCompleted]); // Thêm isLetterFullyCompleted

    const handleDrawingEnd = useCallback(() => {
        // ... (logic giữ nguyên, chỉ cần đảm bảo isLetterFullyCompleted được check nếu cần)
        const wasDrawing = isDrawing;
        setIsDrawing(false); 
        if (wasDrawing && userCurrentStrokePointsRef.current.length > 0 && currentLetterDef && !isLetterFullyCompleted) {
            const currentStrokeGuidePoints = currentLetterDef.strokes[currentStrokeIndex];
            if (currentStrokeGuidePoints && nextExpectedPointIndex < currentStrokeGuidePoints.length) {
                 const lastDrawnPoint = userCurrentStrokePointsRef.current[userCurrentStrokePointsRef.current.length - 1];
                 const targetPoint = currentStrokeGuidePoints[nextExpectedPointIndex];
                 if (distanceToLineSegment(lastDrawnPoint, targetPoint, targetPoint) >= HIT_TOLERANCE) {
                    userCurrentStrokePointsRef.current = [];
                 }
            }
        }
    }, [isDrawing, currentLetterDef, currentStrokeIndex, nextExpectedPointIndex, isLetterFullyCompleted]); // Thêm isLetterFullyCompleted
    
    // Các hàm điều khiển Next, Prev, Reset, Select giữ nguyên
    const handleNextLetter = useCallback(() => { /* ... */ 
        setCurrentAlphabetIndex(prevIdx => (prevIdx + 1) % ALPHABET_DATA.length);
    }, []);
    const handlePrevLetter = useCallback(() => { /* ... */
        setCurrentAlphabetIndex(prevIdx => (prevIdx - 1 + ALPHABET_DATA.length) % ALPHABET_DATA.length);
     }, []);
    const handleResetLetter = useCallback(() => { /* ... */ 
        loadLetter(currentAlphabetIndex);
    }, [currentAlphabetIndex, loadLetter]);
    const handleSelectLetter = useCallback((char: string) => { /* ... */ 
        const index = ALPHABET_DATA.findIndex(def => def.character === char);
        if (index !== -1) {
            setCurrentAlphabetIndex(index);
        }
    }, []);
    
    // JSX giữ nguyên phần Toast và các nút
    return (
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-xl select-none w-full max-w-2xl mx-auto border-2 border-gray-200 relative">
            {/* Toast Container */}
            <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`px-6 py-3 rounded-lg shadow-md text-white text-sm font-medium flex items-center justify-between 
                                    ${toast.type === 'success' ? 'bg-green-500' : ''}
                                    ${toast.type === 'info' ? 'bg-blue-500' : ''}
                                    ${toast.type === 'error' ? 'bg-red-500' : ''}`}
                        style={{ minWidth: '250px', animation: `fadeInOut ${toast.id === toasts[toasts.length-1]?.id ? 3 : 0.5}s ease-in-out forwards` }}
                        // Animation chỉ áp dụng cho toast mới nhất nếu bạn muốn, hoặc cho tất cả
                    >
                        <span>{toast.text}</span>
                        <button onClick={() => removeToast(toast.id)} className="ml-3 text-lg font-bold leading-none hover:text-gray-200">&times;</button>
                    </div>
                ))}
            </div>
            <style jsx global>{`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(20px); } /* Bắt đầu từ phải, hơi dịch xuống */
                    15% { opacity: 1; transform: translateX(0); }
                    85% { opacity: 1; transform: translateX(0); }
                    100% { opacity: 0; transform: translateX(20px); }
                }
            `}</style>

            <h1 className="text-5xl sm:text-6xl font-bold text-slate-700 mb-6">
                {currentLetterDef?.character || ''}
            </h1>
            <div className="relative p-0 rounded-lg shadow-inner">
                <canvas
                    ref={canvasRef}
                    width={400} 
                    height={400}
                    className="cursor-crosshair rounded-md"
                    onMouseDown={handleDrawingStart}
                    onMouseMove={handleDrawingMove}
                    onMouseUp={handleDrawingEnd}
                    onMouseLeave={handleDrawingEnd} 
                    onTouchStart={handleDrawingStart}
                    onTouchMove={handleDrawingMove}
                    onTouchEnd={handleDrawingEnd}
                    onTouchCancel={handleDrawingEnd}
                />
            </div>
            <div className="mt-8 flex space-x-2 sm:space-x-4">
                <button onClick={handlePrevLetter} className="px-4 py-2 sm:px-6 sm:py-3 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600">Trước</button>
                <button onClick={handleResetLetter} className="px-4 py-2 sm:px-6 sm:py-3 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600">Xóa</button>
                <button onClick={handleNextLetter} className="px-4 py-2 sm:px-6 sm:py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600">Sau</button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md sm:max-w-lg">
                {ALPHABET_DATA.map(letter => (
                    <button key={letter.character} onClick={() => handleSelectLetter(letter.character)} className={`w-10 h-10 sm:w-12 sm:h-12 font-bold text-xl rounded-md shadow ${currentLetterDef?.character === letter.character ? 'bg-blue-500 text-white' : 'bg-white text-blue-600 hover:bg-blue-100'}`}>{letter.character}</button>
                ))}
            </div>
        </div>
    );
};

export default AlphabetTracerReactComponent;