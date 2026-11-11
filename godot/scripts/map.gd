extends Control
## The map: a corner minimap centred on the player (north-up, or heading-up
## with O; - and = zoom), and a full-screen map (M) you can drag, zoom with
## the wheel, and click to fast-travel. Drawn over the Sentinel-2 image from
## the same data the world is built from.

signal travel(index: int)

var full := false
var world := {}
var travel_list := []             # [{label, pos}]
var quest: Node
var player: CharacterBody3D
var sat: Texture2D
var font: Font
var scale_px := 0.4               # pixels per metre
var centre := Vector2(-120, 320)
var heading_up := false
var markers := []                 # full map: [{p, name, r, tp}]
var dragging := false
var moved := 0.0


func setup(w: Dictionary, list: Array, q: Node, pl: CharacterBody3D, is_full: bool) -> void:
	world = w
	travel_list = list
	quest = q
	player = pl
	full = is_full
	sat = load("res://textures/satellite.jpg")
	font = ThemeDB.fallback_font
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_STOP if full else Control.MOUSE_FILTER_IGNORE
	if not full: scale_px = 200.0 / 520.0


func _process(_dt: float) -> void:
	if visible: queue_redraw()


func _xy(wx: float, wz: float) -> Vector2:
	return size / 2.0 + (Vector2(wx, wz) - centre) * scale_px


func _draw() -> void:
	var pp := player.global_position
	if not full: centre = Vector2(pp.x, pp.z)
	markers.clear()
	var heading: float = -player.yaw            # clockwise from north
	if not full and heading_up:
		draw_set_transform_matrix(Transform2D(-heading, size / 2.0) * Transform2D(0.0, -size / 2.0))
	draw_rect(Rect2(-size, size * 3.0), Color("c2a468"))
	var e: Dictionary = world["extent"]
	var a := _xy(e["x0"], e["z0"])
	draw_texture_rect(sat, Rect2(a, Vector2(e["x1"] - e["x0"], e["z1"] - e["z0"]) * scale_px), false, Color(1, 0.97, 0.9))
	var m: Dictionary = world["map"]
	for t in m["mastabas"]:
		var c := _xy(t[0], t[1])
		if c.x < -60 or c.y < -60 or c.x > size.x + 60 or c.y > size.y + 60: continue
		var w := maxf(1.5, t[2] * scale_px)
		var d := maxf(1.5, t[3] * scale_px)
		var col := Color(0.92, 0.89, 0.84, 0.9) if t[5] > 0 else Color(0.59, 0.46, 0.28, 0.9)
		if t[4] != 0.0 and w > 3.0:
			var ang := deg_to_rad(t[4])
			var ux := Vector2(cos(ang), sin(ang)) * w / 2.0
			var uy := Vector2(-sin(ang), cos(ang)) * d / 2.0
			draw_colored_polygon(PackedVector2Array([c - ux - uy, c + ux - uy, c + ux + uy, c - ux + uy]), col)
		else:
			draw_rect(Rect2(c - Vector2(w, d) / 2.0, Vector2(w, d)), col)
	for cw in m["causeways"]:
		draw_line(_xy(cw[0], cw[1]), _xy(cw[2], cw[3]), Color(0.35, 0.27, 0.16, 0.6), maxf(2.0, 6.0 * scale_px))
	var wl: Array = m["wall"]
	draw_line(_xy(wl[0], wl[1]), _xy(wl[2], wl[3]), Color("6b5a3a"), maxf(3.0, 8.0 * scale_px))
	for q in m["small"]:
		var s := maxf(2.5, q[2] * scale_px)
		draw_rect(Rect2(_xy(q[0], q[1]) - Vector2(s, s) / 2.0, Vector2(s, s)), Color("c6a76d"))
	for py in world["pyramids"]:
		var c := _xy(py["x"], py["z"])
		var s := maxf(5.0, float(py["base"]) * scale_px)
		var r := Rect2(c - Vector2(s, s) / 2.0, Vector2(s, s))
		draw_rect(r, Color("e8d199"))
		draw_rect(r, Color("7c6840"), false, 1.5)
		draw_line(r.position, r.end, Color("b89b66"), 1.0)
		draw_line(Vector2(r.end.x, r.position.y), Vector2(r.position.x, r.end.y), Color("b89b66"), 1.0)
		if full:
			var label := String(py["id"]).capitalize()
			draw_string(font, c + Vector2(-40, 4), label, HORIZONTAL_ALIGNMENT_CENTER, 80, 13, Color("2a1d08"))
	var sx: Dictionary = world["sphinx"]
	draw_rect(Rect2(_xy(sx["x"], sx["z"]) - Vector2(8, 4), Vector2(16, 8)), Color("c7a884"))
	if full:
		for l in world["landmarks"]:
			var c := _xy(l["pos"][0], l["pos"][2])
			draw_colored_polygon(PackedVector2Array([c + Vector2(0, -5), c + Vector2(5, 0), c + Vector2(0, 5), c + Vector2(-5, 0)]), Color("d89a3a"))
			markers.append({"p": c, "name": l["name"], "r": 8.0, "tp": -1})
		for i in travel_list.size():
			var tp: Vector3 = travel_list[i]["pos"]
			if tp.x < float(e["x0"]) or tp.x > float(e["x1"]) or tp.z < float(e["z0"]) or tp.z > float(e["z1"]): continue     # (the Serapeum is off the map)
			var c := _xy(tp.x, tp.z)
			draw_circle(c, 5.0, Color("0a3a66"))
			draw_circle(c, 3.8, Color("3aa0ff"))
			markers.append({"p": c, "name": travel_list[i]["label"] + "  (click to travel)", "r": 9.0, "tp": i})
		for art in quest.remaining():
			var c := _xy(art["pos"][0], art["pos"][2])
			var star := PackedVector2Array()
			for k in 10:
				var rr := 2.6 if k % 2 else 6.5
				var an := -PI / 2 + k * PI / 5
				star.append(c + Vector2(cos(an), sin(an)) * rr)
			draw_colored_polygon(star, Color("ffd24a"))
			markers.append({"p": c, "name": "Artifact: " + art["name"], "r": 8.0, "tp": -1})
	# the player: view cone and heading arrow
	var p := _xy(pp.x, pp.z)
	var cone := PackedVector2Array([p])
	for k in 9: cone.append(p + Vector2(0, -32).rotated(heading + (k - 4) * 0.157))
	draw_colored_polygon(cone, Color(0.33, 0.88, 0.5, 0.2))
	var arrow := PackedVector2Array()
	for v in [Vector2(0, -9), Vector2(6, 7), Vector2(0, 3), Vector2(-6, 7)]: arrow.append(p + v.rotated(heading))
	draw_colored_polygon(arrow, Color("54e081"))
	arrow.append(arrow[0])
	draw_polyline(arrow, Color("0b3d1f"), 1.5)
	draw_set_transform_matrix(Transform2D.IDENTITY)
	if not full:
		var n := Vector2(size.x / 2.0 - 4, 13)
		if heading_up: n = size / 2.0 + Vector2(0, -(size.y / 2.0 - 11)).rotated(-heading) + Vector2(-4, 4)
		draw_string(font, n, "N", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("ffd98a"))
		draw_rect(Rect2(Vector2.ZERO, size), Color(1.0, 0.85, 0.54, 0.7), false, 2.0)
		return
	draw_rect(Rect2(8, 8, 660, 258), Color(0.08, 0.06, 0.03, 0.72))
	draw_string(font, Vector2(18, 28), "Giza Plateau — drag to pan · wheel to zoom · click a blue dot to travel · M or Esc to close", HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color("fff1cf"))
	draw_string(font, Vector2(18, 50), quest.summary(), HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("ffd98a"))
	var y := 78.0
	for line in quest.achievements_text().split("\n", false):
		draw_string(font, Vector2(18, y), line, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(1, 0.95, 0.82, 0.85))
		y += 16.0
	var hov = _marker_at(get_local_mouse_position())
	if hov != null:
		var text: String = hov["name"]
		var w := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
		var at: Vector2 = hov["p"] + Vector2(12, -10)
		draw_rect(Rect2(at - Vector2(5, 15), Vector2(w + 10, 21)), Color(0, 0, 0, 0.75))
		draw_string(font, at, text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("fff1cf"))


func _marker_at(mp: Vector2):
	var best = null
	var bd := 1e9
	for mk in markers:
		var d: float = mk["p"].distance_to(mp)
		# travel points win over the diamonds and stars they sit next to
		if d < mk["r"] + 5.0 and d - (4.0 if mk["tp"] >= 0 else 0.0) < bd:
			bd = d - (4.0 if mk["tp"] >= 0 else 0.0)
			best = mk
	return best


func zoom(f: float, about := Vector2(-1, -1)) -> void:
	var before := scale_px
	scale_px = clampf(scale_px * f, 0.08 if full else 0.12, 6.0 if full else 2.0)
	if full and about.x >= 0.0:
		centre += (about - size / 2.0) * (1.0 / before - 1.0 / scale_px)


func _gui_input(ev: InputEvent) -> void:
	if not full: return
	if ev is InputEventMouseButton:
		if ev.button_index == MOUSE_BUTTON_WHEEL_UP and ev.pressed: zoom(1.15, ev.position)
		elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN and ev.pressed: zoom(1.0 / 1.15, ev.position)
		elif ev.button_index == MOUSE_BUTTON_LEFT:
			if ev.pressed:
				dragging = true
				moved = 0.0
			else:
				dragging = false
				if moved < 5.0:
					var mk = _marker_at(ev.position)
					if mk != null and mk["tp"] >= 0: travel.emit(mk["tp"])
	elif ev is InputEventMouseMotion and dragging:
		moved += ev.relative.length()
		centre -= ev.relative / scale_px
