import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import type { FamilyData, Language } from "../../../types/family";
import {
	getDisplayName,
	getLifeLine,
	getPerson,
	getPersonInitials,
	type TreeScene,
} from "../lib/tree";

interface TreeViewportProps {
	data: FamilyData;
	language: Language;
	scene: TreeScene;
	selectedId: string | null;
	onSelect: (personId: string) => void;
	allowWheelZoom?: boolean;
	mode?: "preview" | "explore";
}

interface TransformState {
	scale: number;
	tx: number;
	ty: number;
}

interface DragState {
	pointerId: number;
	startX: number;
	startY: number;
	originTx: number;
	originTy: number;
}

interface PinchState {
	centerX: number;
	centerY: number;
	distance: number;
	scale: number;
	tx: number;
	ty: number;
}

export interface TreeViewportHandle {
	fit: () => void;
	zoomIn: () => void;
	zoomOut: () => void;
	centerOn: (personId: string) => void;
}

const SCALE_MIN = 0.18;
const SCALE_MAX = 2.5;

const TreeViewport = forwardRef<TreeViewportHandle, TreeViewportProps>(
	(
		{
			data,
			language,
			scene,
			selectedId,
			onSelect,
			allowWheelZoom = false,
			mode = "preview",
		},
		ref,
	) => {
		const viewportRef = useRef<HTMLDivElement>(null);
		const dragRef = useRef<DragState | null>(null);
		const pinchRef = useRef<PinchState | null>(null);
		const transformRef = useRef<TransformState>({
			scale: 1,
			tx: 0,
			ty: 0,
		});

		const [dragging, setDragging] = useState(false);
		const [transform, setTransform] = useState<TransformState>({
			scale: 1,
			tx: 0,
			ty: 0,
		});

		const updateTransform = (
			next:
				| TransformState
				| ((current: TransformState) => TransformState),
		) => {
			const resolved =
				typeof next === "function" ? next(transformRef.current) : next;
			transformRef.current = resolved;
			setTransform(resolved);
		};

		const fit = useCallback(() => {
			const viewport = viewportRef.current;
			if (!viewport) {
				return;
			}

			const viewportWidth = viewport.clientWidth;
			const viewportHeight = viewport.clientHeight;
			const padding = 30;
			const scaleHeight = (viewportHeight - padding * 2) / scene.height;
			const scaleWidth = (viewportWidth - padding * 2) / scene.width;
			let nextScale = Math.min(scaleHeight, scaleWidth, 1);

			if (nextScale < 0.35) {
				nextScale = viewportWidth < 768 ? 0.5 : 0.55;
			}

			nextScale = Math.max(nextScale, SCALE_MIN);

			updateTransform({
				scale: nextScale,
				tx: (viewportWidth - scene.width * nextScale) / 2,
				ty: padding,
			});
		}, [scene.height, scene.width]);

		const centerOn = useCallback(
			(personId: string) => {
				const viewport = viewportRef.current;
				const bounds = scene.boundsByPerson[personId];
				if (!viewport || !bounds) {
					return;
				}

				const { scale } = transformRef.current;
				updateTransform({
					scale,
					tx:
						viewport.clientWidth / 2 -
						(bounds.x + bounds.width / 2) * scale,
					ty:
						viewport.clientHeight / 2 -
						(bounds.y + bounds.height / 2) * scale,
				});
			},
			[scene.boundsByPerson],
		);

		const zoomBy = useCallback((factor: number) => {
			const viewport = viewportRef.current;
			if (!viewport) {
				return;
			}

			const current = transformRef.current;
			const nextScale = Math.min(
				Math.max(current.scale * factor, SCALE_MIN),
				SCALE_MAX,
			);

			const centerX = viewport.clientWidth / 2;
			const centerY = viewport.clientHeight / 2;

			updateTransform({
				scale: nextScale,
				tx: centerX - (centerX - current.tx) * (nextScale / current.scale),
				ty: centerY - (centerY - current.ty) * (nextScale / current.scale),
			});
		}, []);

		useImperativeHandle(
			ref,
			() => ({
				fit,
				zoomIn: () => zoomBy(1.15),
				zoomOut: () => zoomBy(1 / 1.15),
				centerOn,
			}),
			[centerOn, fit, zoomBy],
		);

		useEffect(() => {
			fit();
		}, [fit]);

		useEffect(() => {
			const onResize = () => fit();
			window.addEventListener("resize", onResize);
			return () => window.removeEventListener("resize", onResize);
		}, [fit]);

		useEffect(() => {
			if (selectedId) {
				centerOn(selectedId);
			}
		}, [centerOn, selectedId]);

		return (
			<main
				className={`tree-viewport${dragging ? " dragging" : ""}`}
				id="viewport"
				onPointerCancel={() => {
					dragRef.current = null;
					setDragging(false);
				}}
				onPointerDown={(event) => {
					if (event.pointerType === "touch") {
						return;
					}

					const target = event.target;
					if (
						event.button !== 0 ||
						!(target instanceof Element) ||
						target.closest(".node") ||
						target.closest(".spouse-token")
					) {
						return;
					}

					dragRef.current = {
						pointerId: event.pointerId,
						startX: event.clientX,
						startY: event.clientY,
						originTx: transformRef.current.tx,
						originTy: transformRef.current.ty,
					};
					setDragging(true);
					event.currentTarget.setPointerCapture(event.pointerId);
				}}
				onPointerMove={(event) => {
					if (event.pointerType === "touch") {
						return;
					}

					const drag = dragRef.current;
					if (!drag || drag.pointerId !== event.pointerId) {
						return;
					}

					updateTransform({
						...transformRef.current,
						tx: drag.originTx + event.clientX - drag.startX,
						ty: drag.originTy + event.clientY - drag.startY,
					});
				}}
				onPointerUp={(event) => {
					if (event.pointerType === "touch") {
						return;
					}

					if (dragRef.current?.pointerId === event.pointerId) {
						dragRef.current = null;
						setDragging(false);
					}
				}}
				onTouchEnd={() => {
					pinchRef.current = null;
				}}
				onTouchMove={(event) => {
					if (event.touches.length !== 2) {
						pinchRef.current = null;
						return;
					}

					const viewport = viewportRef.current;
					if (!viewport) {
						return;
					}

					const [firstTouch, secondTouch] = Array.from(event.touches);
					const rect = viewport.getBoundingClientRect();
					const centerX =
						(firstTouch.clientX + secondTouch.clientX) / 2 - rect.left;
					const centerY =
						(firstTouch.clientY + secondTouch.clientY) / 2 - rect.top;
					const distance = Math.hypot(
						secondTouch.clientX - firstTouch.clientX,
						secondTouch.clientY - firstTouch.clientY,
					);

					if (!pinchRef.current) {
						pinchRef.current = {
							centerX,
							centerY,
							distance,
							scale: transformRef.current.scale,
							tx: transformRef.current.tx,
							ty: transformRef.current.ty,
						};
						return;
					}

					event.preventDefault();

					const start = pinchRef.current;
					const nextScale = Math.min(
						Math.max(start.scale * (distance / start.distance), SCALE_MIN),
						SCALE_MAX,
					);

					updateTransform({
						scale: nextScale,
						tx: centerX - (start.centerX - start.tx) * (nextScale / start.scale),
						ty: centerY - (start.centerY - start.ty) * (nextScale / start.scale),
					});
				}}
				onWheel={(event) => {
					if (!allowWheelZoom) {
						return;
					}

					event.preventDefault();

					const viewport = viewportRef.current;
					if (!viewport) {
						return;
					}

					const current = transformRef.current;
					const rect = viewport.getBoundingClientRect();
					const pointerX = event.clientX - rect.left;
					const pointerY = event.clientY - rect.top;
					const nextScale = Math.min(
						Math.max(
							current.scale * (event.deltaY > 0 ? 0.9 : 1.1),
							SCALE_MIN,
						),
						SCALE_MAX,
					);

					updateTransform({
						scale: nextScale,
						tx: pointerX - (pointerX - current.tx) * (nextScale / current.scale),
						ty: pointerY - (pointerY - current.ty) * (nextScale / current.scale),
					});
				}}
				ref={viewportRef}
			>
				<div
					className="tree-scene"
					id="scene"
					style={{
						height: `${scene.height}px`,
						transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
						width: `${scene.width}px`,
					}}
				>
					<svg className="lines" height={scene.height} width={scene.width}>
						{scene.lines.map((line, index) => (
							<line
								key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}-${index}`}
								stroke="#c8b88a"
								strokeWidth="1.2"
								x1={line.x1}
								x2={line.x2}
								y1={line.y1}
								y2={line.y2}
							/>
						))}
					</svg>

					{scene.connectors.map((connector, index) => (
						<div
							className="marriage-link-h"
							key={`${connector.x}-${connector.y}-${connector.width}-${index}`}
							style={{
								height: "2px",
								left: `${connector.x}px`,
								position: "absolute",
								top: `${connector.y}px`,
								width: `${connector.width}px`,
							}}
						>
							<svg height="2" style={{ overflow: "visible" }} width={connector.width}>
								<line
									stroke="#a47e2d"
									strokeDasharray="2 2"
									strokeWidth="1"
									x1="0"
									x2={connector.width}
									y1="1"
									y2="1"
								/>
							</svg>
						</div>
					))}

					{scene.nodes.map((node) => {
						const person = getPerson(data, node.personId);
						const initials = getPersonInitials(person, language);

						if (node.kind === "spouse") {
							return (
								<button
									className={`spouse-token${selectedId === node.personId ? " focus" : ""}`}
									data-gender={person?.gender ?? "m"}
									key={node.id}
									onClick={() => onSelect(node.personId)}
									style={{
										height: `${node.height}px`,
										left: `${node.x}px`,
										top: `${node.y}px`,
										width: `${node.width}px`,
									}}
									title={getDisplayName(person, language)}
									type="button"
								>
									<span className="tok-initial">{initials}</span>
								</button>
							);
						}

						const lifeLine = getLifeLine(person, language);

						return (
							<button
								className={`node${node.isLeaf ? " node-leaf" : ""}${selectedId === node.personId ? " focus" : ""}`}
								data-gender={person?.gender ?? "m"}
								key={node.id}
								onClick={() => onSelect(node.personId)}
								style={{
									height: `${node.height}px`,
									left: `${node.x}px`,
									top: `${node.y}px`,
									width: `${node.width}px`,
								}}
								type="button"
							>
								<div className="avatar">{initials}</div>
								<div className="name">
									<span className="name-ar">{person?.ar || "—"}</span>
									<span className="name-en">{person?.en || "—"}</span>
									{lifeLine ? <span className="dates">{lifeLine}</span> : null}
								</div>
							</button>
						);
					})}
				</div>

				<div className="viewport-hint">
					<span>
						{mode === "explore"
							? language === "ar"
								? "اسحب للتنقل • زوّم بالماوس أو الأزرار • وعلى الموبايل استخدم pinch"
								: "Drag to pan • Zoom with wheel or buttons • On mobile, use pinch"
							: language === "ar"
								? "اسحب للتنقل • كبّر من الأزرار • وللاستكشاف الكامل افتح وضع الاستكشاف"
								: "Drag to pan • Zoom with the buttons • Open Explore mode for full interaction"}
					</span>
				</div>
			</main>
		);
	},
);

TreeViewport.displayName = "TreeViewport";

export default TreeViewport;
