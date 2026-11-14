extends Node3D
## Life on the plateau: visitors who walk, horse carriages and camel rides
## plying the mapped site roads, a caravan in the desert, saddled camels you
## can ride, birds circling overhead, and the evening Sound & Light show.
## (The same things the web build does in js/life.js.)

var main: Node                    # for terrain_height()
var mats := {}
var movers := []                  # {g, route, s, speed, type, ph, legs, wheels}
var caravan := []
var birds := []
var rideables: Array[Node3D] = []
var people := []
var visitors_checked := false
var camel_scene: PackedScene = load("res://models/camel.glb")
var horse_scene: PackedScene = load("res://models/horse.glb")
var person_scene: PackedScene = load("res://models/person.glb")
var show_lights := []
var show_level := 0.0
var t := 0.0
var rng := RandomNumberGenerator.new()

const SPOTS := [[7, -150, 38, 34], [150, -110, 25, 10], [448, 452, 22, 26], [-330, 222, 30, 14], [-575, 660, 22, 8],
	[-737, 1149, 18, 16], [4, -235, 55, 18], [395, 395, 14, 8], [-160, 352, 22, 10]]
const SHIRTS := [0xf2f2f2, 0x2b4f8c, 0xc23b2f, 0x1e1e1e, 0xe8c547, 0x6fa36a, 0xd98ab0, 0x8a6b4a, 0x4fb3c9, 0xb0b0b0, 0xf28c28]
const TROUSERS := [0x2a3550, 0x1e1e1e, 0xd8cfb8, 0x5a5a5a, 0x3c5a3c, 0xe8e2d4]
const SKINS := [0xc99d78, 0x8d5f3f, 0xe6c2a0, 0xa8754f, 0xf0d2b8]
const SADDLES := [0xb03030, 0x2d5aa0, 0xd8a030, 0x3f7f3f]
const CARRIAGES := [
	{"horse": 0x2a1d14, "cart": 0x7a1b1b, "wheel": 0xc9a227, "plume": 0xd23c3c},
	{"horse": 0xd9d2c4, "cart": 0x1f4f7a, "wheel": 0xd8c27a, "plume": 0x2f7fd0},
	{"horse": 0x5a3b24, "cart": 0x2c5d2a, "wheel": 0xc9a227, "plume": 0xe2b33c},
	{"horse": 0x3b2b20, "cart": 0x6b2f6b, "wheel": 0xd8c27a, "plume": 0xcf4fb0}]
const PALETTE := [Color(1.0, 0.23, 0.18), Color(0.18, 0.48, 1.0), Color(1.0, 0.69, 0.18), Color(0.18, 1.0, 0.6), Color(0.78, 0.29, 1.0), Color(1, 1, 1)]


static func rgb(h: int) -> Color:
	return Color8((h >> 16) & 255, (h >> 8) & 255, h & 255)


func _mat(h: int, rough := 0.85) -> StandardMaterial3D:
	var k := "%d_%d" % [h, int(rough * 100)]
	if not mats.has(k):
		var m := StandardMaterial3D.new()
		m.albedo_color = rgb(h)
		m.roughness = rough
		mats[k] = m
	return mats[k]


func _box(parent: Node3D, size: Vector3, pos: Vector3, mat: Material, pivot := Vector3.ZERO) -> Node3D:
	# `pivot` moves the geometry inside its node, so the node rotates about a joint
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	if pivot == Vector3.ZERO:
		mi.position = pos
		parent.add_child(mi)
		return mi
	var joint := Node3D.new()
	joint.position = pos
	mi.position = pivot
	joint.add_child(mi)
	parent.add_child(joint)
	return joint


func setup(main_node: Node, world: Dictionary) -> void:
	main = main_node
	rng.seed = 7
	_traffic(world["routes"])
	for c in world["rideables"]:
		var g := build_camel(int(c["saddle"]))
		var x := float(c["x"])
		var z := float(c["z"])
		g.position = Vector3(x, main.terrain_height(x, z), z)
		g.rotation.y = float(c["rot"])
		var body := StaticBody3D.new()          # waiting camels are solid (until you are on one)
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = Vector3(2.2, 1.9, 0.9)
		cs.shape = bs
		cs.position.y = 1.25
		body.add_child(cs)
		g.add_child(body)
		g.set_meta("solid", cs)
		add_child(g)
		rideables.append(g)
	for i in 4:
		var g := build_camel(-1)
		add_child(g)
		caravan.append({"g": g, "off": i * 8.5, "ph": i * 1.3})
	_birds()
	_visitors()
	_light_show(world)


# ---- Blender-built, rigged creatures (tools/blender/creatures.py) -------------
# colours: {material slot: 0xRRGGBB}; show: which optional "opt_*" dress to keep
func _spawn(scene: PackedScene, colours: Dictionary, show: Array) -> Node3D:
	var g: Node3D = scene.instantiate()
	for n in g.find_children("*", "", true, false):
		var nm := String(n.name)
		if nm.begins_with("opt_") and n is Node3D:
			(n as Node3D).visible = show.has(nm.substr(4))
		if n is MeshInstance3D:
			var mi: MeshInstance3D = n
			for i in mi.mesh.get_surface_count():
				var src := mi.mesh.surface_get_material(i)
				if src != null and colours.has(src.resource_name):
					mi.set_surface_override_material(i, _mat(colours[src.resource_name], 0.85))
		elif n is AnimationPlayer:
			var ap: AnimationPlayer = n
			for a in ap.get_animation_list(): ap.get_animation(a).loop_mode = Animation.LOOP_LINEAR
			g.set_meta("ap", ap)
			g.set_meta("anim", "")
	return g


func _play(g: Node3D, anim: String, speed := 1.0, offset := -1.0) -> void:
	var ap: AnimationPlayer = g.get_meta("ap")
	if g.get_meta("anim") != anim:
		g.set_meta("anim", anim)
		ap.play(anim, 0.25)
		if offset >= 0.0: ap.seek(fmod(offset, ap.current_animation_length), true)
	ap.speed_scale = speed


const COATS := [0x9a7446, 0x8f6a3e, 0xa9824f, 0x86633a, 0xb39a70]

func build_camel(saddle: int) -> Node3D:
	var c := _spawn(camel_scene, {"coat": COATS[rng.randi() % COATS.size()], "saddle": maxi(saddle, 0)}, ["saddle"] if saddle >= 0 else [])
	var s := 0.94 + rng.randf() * 0.12
	c.scale = Vector3(s, s, s)
	return c


func animate_camel(c: Node3D, _time: float, speed: float, ph := 0.0) -> void:
	if speed < 0.08: _play(c, "idle", 1.0, ph)
	else: _play(c, "walk", speed / 1.06, ph)


func set_solid(c: Node3D, on: bool) -> void:
	(c.get_meta("solid") as CollisionShape3D).disabled = not on


func _person(colours: Dictionary, show: Array, anim: String) -> Node3D:
	var g := _spawn(person_scene, colours, show)
	_play(g, anim, 1.0, rng.randf() * 3.0)
	return g


# ---- horse carriages and camel rides on the site roads -------------------------
func _carriage(c: Dictionary) -> Node3D:
	var g := Node3D.new()
	var horse := _spawn(horse_scene, {"coat": c["horse"], "harness": c["plume"]}, ["harness"])
	horse.position = Vector3(2.35, 0, 0)
	g.add_child(horse)
	_box(g, Vector3(2.3, 0.07, 0.07), Vector3(1.5, 1.05, 0.42), _mat(0x3a2a1a, 0.8))
	_box(g, Vector3(2.3, 0.07, 0.07), Vector3(1.5, 1.05, -0.42), _mat(0x3a2a1a, 0.8))
	_box(g, Vector3(1.7, 0.5, 1.3), Vector3(-0.2, 1.05, 0), _mat(c["cart"], 0.5))
	_box(g, Vector3(0.75, 0.12, 1.2), Vector3(-0.55, 1.36, 0), _mat(0x5a1f1f, 0.7))       # passenger bench
	_box(g, Vector3(0.12, 0.5, 1.2), Vector3(-0.95, 1.6, 0), _mat(0x5a1f1f, 0.7))
	_box(g, Vector3(0.5, 0.1, 1.0), Vector3(0.4, 1.42, 0), _mat(0x2a2a2a, 0.7))            # driver's box
	_box(g, Vector3(1.5, 0.06, 1.45), Vector3(-0.45, 2.55, 0), _mat(0x1d1d1d, 0.6))
	for sx in [-1.15, 0.25]:
		for sz in [-0.66, 0.66]: _box(g, Vector3(0.05, 1.25, 0.05), Vector3(sx, 1.93, sz), _mat(0x2a2a2a, 0.8))
	var wheels := []
	for w_def in [[-0.55, 0.62, 0.6], [0.45, 0.45, 0.43]]:
		for sz in [-0.74, 0.74]:
			var w := Node3D.new()
			w.position = Vector3(w_def[0], w_def[1], sz)
			var rim := MeshInstance3D.new()
			var tm := TorusMesh.new()
			tm.inner_radius = w_def[2] - 0.05
			tm.outer_radius = w_def[2] + 0.02
			tm.rings = 20
			tm.ring_segments = 6
			rim.mesh = tm
			rim.material_override = _mat(c["wheel"], 0.6)
			rim.rotation.x = PI / 2
			w.add_child(rim)
			for k in 4:
				var sp := _box(w, Vector3(w_def[2] * 2.0, 0.035, 0.035), Vector3.ZERO, _mat(c["wheel"], 0.6))
				sp.rotation.z = k * PI / 4
			w.set_meta("r", w_def[2])
			g.add_child(w)
			wheels.append(w)
	var driver := _person({"robe": 0xe9e3d6, "shirt": 0xe9e3d6, "skin": 0x8d5f3f, "scarf": 0xf0ece2}, ["robe", "scarf"], "sit")
	driver.position = Vector3(0.4, 0.58, 0)
	g.add_child(driver)
	g.set_meta("horse", horse)
	g.set_meta("wheels", wheels)
	return g


func _traffic(flat_routes: Array) -> void:
	var ri := 0
	for flat in flat_routes:
		var pts := PackedVector2Array()
		for i in range(0, flat.size(), 2): pts.append(Vector2(flat[i], flat[i + 1]))
		var cum := PackedFloat32Array([0.0])
		for i in range(1, pts.size()): cum.append(cum[i - 1] + pts[i].distance_to(pts[i - 1]))
		var length := cum[cum.size() - 1]
		if length <= 200.0: continue
		# Since the 2025 reorganisation, horses, camels and carriages work only on the south side of the
		# plateau and between the Panorama and the dunes: keep to the site roads there.
		var mid := Vector2.ZERO
		for q in pts: mid += q / pts.size()
		if not (mid.y > 480.0 or mid.x < -940.0): continue
		var route := {"pts": pts, "cum": cum, "len": length}
		for k in maxi(1, roundi(length / 700.0)):
			var g := _carriage(CARRIAGES[(ri + k) % CARRIAGES.size()])
			add_child(g)
			movers.append({"g": g, "r": route, "s": rng.randf() * length * 2.0, "speed": 2.6 + rng.randf() * 1.0, "carriage": true, "ph": rng.randf() * 6.0})
		for k in maxi(1, roundi(length / 900.0)):
			var c := build_camel(SADDLES[k % 4])
			var rider := _person({"shirt": SHIRTS[(ri + k) % SHIRTS.size()], "trousers": TROUSERS[k % TROUSERS.size()], "skin": 0xe6c2a0, "hat": 0xd9c79a},
				["hat"] if k % 2 == 0 else [], "sit")
			rider.position = Vector3(-0.1, 1.5, 0)
			c.add_child(rider)
			var guide := _person({"robe": [0x3d5a7a, 0xd8d2c2, 0x6b6b6b][k % 3], "skin": 0x8d5f3f, "scarf": 0xf0ece2, "shoes": 0x4a3a2a}, ["robe", "scarf"], "walk")   # a cameleer leads it
			guide.position = Vector3(2.4, 0, 0.75)
			c.add_child(guide)
			c.set_meta("guide", guide)
			add_child(c)
			movers.append({"g": c, "r": route, "s": rng.randf() * length * 2.0, "speed": 1.1 + rng.randf() * 0.3, "carriage": false, "ph": rng.randf() * 6.0})
		ri += 1


func _on_route(r: Dictionary, s: float) -> Vector3:      # x, z, yaw — back and forth along the road
	var length: float = r["len"]
	var d := fmod(s, 2.0 * length)
	var dir := 1.0
	if d > length:
		d = 2.0 * length - d
		dir = -1.0
	var cum: PackedFloat32Array = r["cum"]
	var pts: PackedVector2Array = r["pts"]
	var i := 1
	while i < cum.size() - 1 and cum[i] < d: i += 1
	var a := pts[i - 1]
	var b := pts[i]
	var u := (d - cum[i - 1]) / maxf(1e-6, cum[i] - cum[i - 1])
	return Vector3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, atan2(-(b.y - a.y) * dir, (b.x - a.x) * dir))


# ---- birds -------------------------------------------------------------------
func _birds() -> void:
	var m := _mat(0x2b2218, 1.0)
	for i in 12:
		var b := Node3D.new()
		var wings := []
		for s in [-1.0, 1.0]:
			var w := _box(b, Vector3(2.2, 0.12, 0.7), Vector3(s * 0.1, 0, 0), m, Vector3(s * 1.1, 0, 0))
			wings.append(w)
		add_child(b)
		birds.append({"g": b, "w": wings, "cx": -150 + rng.randf() * 400, "cz": -100 + rng.randf() * 600, "r": 40 + rng.randf() * 120,
			"y": 70 + rng.randf() * 90, "sp": 0.05 + rng.randf() * 0.08, "ph": rng.randf() * 7})


# ---- visitors who walk ------------------------------------------------------------
const HAIR := [0x15100c, 0x2a1c12, 0x4a3320, 0x8a6a3a, 0x6b6b6b, 0x1a1a1a]

func _visitors() -> void:
	for sp in SPOTS:
		for i in int(sp[3]):
			var a := rng.randf() * TAU
			var r := sqrt(rng.randf()) * float(sp[2])
			var shirt: int = SHIRTS[rng.randi() % SHIRTS.size()]
			var show := []
			if rng.randf() < 0.3: show.append("hat")
			if rng.randf() < 0.3: show.append("pack")
			var local := rng.randf() < 0.12                        # a few locals in galabiyas among the tourists
			if local: show = ["robe", "scarf"]
			var g := _person({"shirt": shirt, "robe": [0xd8d2c2, 0x4a5a6a, 0x7a6a55][rng.randi() % 3], "trousers": TROUSERS[rng.randi() % TROUSERS.size()],
				"skin": SKINS[rng.randi() % SKINS.size()], "hair": HAIR[rng.randi() % HAIR.size()], "hat": [0xe6d9b0, 0xf2f2f2, 0x3a4a6a][rng.randi() % 3],
				"pack": [0x2f4a3a, 0x7a2a2a, 0x2a3a6a, 0x222222][rng.randi() % 4], "scarf": 0xf0ece2}, show, "idle")
			var h := 0.9 + rng.randf() * 0.17
			g.scale = Vector3(h, h, h) * Vector3(0.92 + rng.randf() * 0.2, 1.0, 0.92 + rng.randf() * 0.2)
			add_child(g)
			var p := {"g": g, "sx": float(sp[0]), "sz": float(sp[1]), "sr": float(sp[2]), "x": sp[0] + cos(a) * r, "z": sp[1] + sin(a) * r,
				"wait": rng.randf() * 6.0, "speed": 0.9 + rng.randf() * 0.5, "ph": rng.randf() * 9.0, "yaw": rng.randf() * 6.3}
			p["tx"] = p["x"]
			p["tz"] = p["z"]
			people.append(p)


## True where masonry stands on the ground (a mastaba, a wall, a fallen block). Visitors are not
## started inside it and do not pick a walk that crosses it: before this, up to a quarter of them at
## some spots stood buried in stone.
func _blocked(x: float, z: float) -> bool:
	var th: float = main.terrain_height(x, z)
	var rq := PhysicsRayQueryParameters3D.create(Vector3(x, th + 40.0, z), Vector3(x, th + 0.3, z))
	return not get_world_3d().direct_space_state.intersect_ray(rq).is_empty()


func _path_clear(x0: float, z0: float, x1: float, z1: float) -> bool:
	var n := maxi(1, ceili(Vector2(x1 - x0, z1 - z0).length() / 1.5))
	for i in range(1, n + 1):
		if _blocked(lerpf(x0, x1, float(i) / n), lerpf(z0, z1, float(i) / n)): return false
	return true


func _update_visitors(dt: float, eye: Vector3) -> void:
	if not visitors_checked and Engine.get_physics_frames() > 2:
		visitors_checked = true
		for p in people:
			if not _blocked(p["x"], p["z"]): continue
			for i in 24:
				var a := rng.randf() * TAU
				var r := sqrt(rng.randf()) * float(p["sr"])
				var x: float = p["sx"] + cos(a) * r
				var z: float = p["sz"] + sin(a) * r
				if _blocked(x, z): continue
				p["x"] = x
				p["z"] = z
				p["tx"] = x
				p["tz"] = z
				p.erase("placed")
				break
	for p in people:
		var g: Node3D = p["g"]
		var far: float = absf(p["x"] - eye.x) + absf(p["z"] - eye.z)
		g.visible = far < 900.0 and Vector2(p["x"] - eye.x, p["z"] - eye.z).length() > 1.3     # nobody stands in your face
		var ap: AnimationPlayer = g.get_meta("ap")
		ap.active = far < 260.0                                # distant crowds hold their pose
		if far > 500.0 and p.has("placed"): continue
		p["placed"] = true
		var walking := false
		var look := 0.0
		if p["wait"] > 0.0:
			p["wait"] -= dt
			look = sin(t * 0.7 + p["ph"]) * 0.6
		else:
			var dx: float = p["tx"] - p["x"]
			var dz: float = p["tz"] - p["z"]
			var d := sqrt(dx * dx + dz * dz)
			if d < 0.3:
				p["wait"] = 2.0 + rng.randf() * 9.0
				for tries in 6:                                  # a walk that does not cross masonry; else stay put
					var a := rng.randf() * TAU
					var r := sqrt(rng.randf()) * float(p["sr"])
					var tx: float = p["sx"] + cos(a) * r
					var tz: float = p["sz"] + sin(a) * r
					if _path_clear(p["x"], p["z"], tx, tz):
						p["tx"] = tx
						p["tz"] = tz
						break
			else:
				p["x"] += dx / d * p["speed"] * dt
				p["z"] += dz / d * p["speed"] * dt
				p["yaw"] = lerp_angle(p["yaw"], atan2(dx, dz), minf(1.0, dt * 6.0))
				walking = true
		g.position = Vector3(p["x"], main.terrain_height(p["x"], p["z"]), p["z"])
		g.rotation.y = p["yaw"] + (0.0 if walking else look) - PI / 2
		if walking: _play(g, "walk", p["speed"] / 1.5)
		else: _play(g, "idle")


# ---- the Sound & Light show ---------------------------------------------------
func _light_show(world: Dictionary) -> void:
	var s: Dictionary = world["sphinx"]
	var origin := Vector3(float(s["x"]) + 120.0, float(s["floorY"]) + 6.0, float(s["z"]) + 10.0)
	var targets := [[Vector3(float(s["x"]) + 10.0, float(s["floorY"]) + 12.0, float(s["z"])), 0.2, 9.0]]
	var lift := {"khufu": 50.0, "khafre": 50.0, "menkaure": 22.0}
	var ang := {"khufu": 0.19, "khafre": 0.16, "menkaure": 0.09}
	for py in world["pyramids"]:
		if lift.has(py["id"]):
			targets.append([Vector3(float(py["x"]), float(py["baseY"]) + lift[py["id"]], float(py["z"])), ang[py["id"]], 12.0])
	for i in targets.size():
		var l := SpotLight3D.new()
		l.spot_range = 1600.0
		l.spot_attenuation = 0.02
		l.spot_angle = rad_to_deg(targets[i][1])
		l.spot_angle_attenuation = 0.6
		l.shadow_enabled = false
		l.visible = false
		add_child(l)
		l.look_at_from_position(origin + Vector3(i * 6.0, 0, -12.0 + i * 8.0), targets[i][0], Vector3.UP)
		show_lights.append({"l": l, "k": targets[i][2]})


func show_origin() -> Vector3:
	return show_lights[0]["l"].global_position if show_lights.size() > 0 else Vector3.ZERO


# ---- every frame ---------------------------------------------------------------
func update(dt: float, eye: Vector3, night: float, riding: Node3D) -> void:
	t += dt
	for m in movers:
		m["s"] += m["speed"] * dt
		var p := _on_route(m["r"], m["s"])
		var g: Node3D = m["g"]
		g.position = Vector3(p.x, main.terrain_height(p.x, p.y), p.y)
		g.rotation.y = p.z
		# lean with the slope, so the horse ahead of its cart and the cameleer ahead of his camel stay on the ground
		var fwd := Vector2(cos(p.z), -sin(p.z)) * 2.2
		g.rotation.z = atan2(main.terrain_height(p.x + fwd.x, p.y + fwd.y) - main.terrain_height(p.x - fwd.x, p.y - fwd.y), 4.4)
		if absf(p.x - eye.x) + absf(p.y - eye.z) > 500.0: continue
		if m["carriage"]:
			_play(g.get_meta("horse"), "walk", m["speed"] / 1.7, m["ph"])
			for w in g.get_meta("wheels"): w.rotation.z -= m["speed"] * dt / float(w.get_meta("r"))
		else:
			animate_camel(g, t, m["speed"], m["ph"])
			_play(g.get_meta("guide"), "walk", m["speed"] / 1.5)
	for c in caravan:
		var s: float = (t * 1.1 + c["off"]) / 55.0
		var x := -180.0 + cos(s) * 55.0
		var z := 640.0 + sin(s) * 55.0
		c["g"].position = Vector3(x, main.terrain_height(x, z), z)
		c["g"].rotation.y = -s - PI / 2
		animate_camel(c["g"], t, 1.1, c["ph"])
	for b in birds:
		var a: float = b["ph"] + t * b["sp"]
		b["g"].position = Vector3(b["cx"] + cos(a) * b["r"], b["y"] + sin(a * 2.0) * 4.0, b["cz"] + sin(a) * b["r"])
		b["g"].rotation.y = -a + PI / 2
		var flap := sin(t * 6.0 + b["ph"]) * 0.35
		b["w"][0].rotation.z = -0.5 - flap
		b["w"][1].rotation.z = 0.5 + flap
	_update_visitors(dt, eye)
	for c in rideables:
		if c != riding: animate_camel(c, t, 0.0)
	show_level = lerpf(show_level, night, 1.0 - exp(-0.8 * dt))
	var cyc := t / 9.0
	for i in show_lights.size():
		var l: SpotLight3D = show_lights[i]["l"]
		l.visible = show_level > 0.02
		if not l.visible: continue
		var q := cyc + i * 1.7
		var ca: Color = PALETTE[int(q) % PALETTE.size()]
		var cb: Color = PALETTE[(int(q) + 1) % PALETTE.size()]
		l.light_color = ca.lerp(cb, smoothstep(0.75, 1.0, fmod(q, 1.0)))
		l.light_energy = show_level * float(show_lights[i]["k"]) * 0.22 * (0.75 + 0.25 * sin(t * 0.5 + i * 2.0))
