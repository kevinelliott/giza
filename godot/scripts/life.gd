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
var mm := {}                      # part name -> MultiMesh
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
		bs.size = Vector3(3.4, 2.6, 1.4)
		cs.shape = bs
		cs.position.y = 1.9
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


# ---- camels (faces +X; legs are joints at the hip) --------------------------
func build_camel(saddle: int) -> Node3D:
	var g := Node3D.new()
	var m := _mat(0xb18752, 0.95)
	_box(g, Vector3(3.4, 1.6, 1.4), Vector3(0, 2.0, 0), m)
	_box(g, Vector3(1.1, 1.0, 1.1), Vector3(-0.5, 3.0, 0), m)
	_box(g, Vector3(1.0, 0.8, 1.0), Vector3(0.7, 2.9, 0), m)
	_box(g, Vector3(0.7, 2.0, 0.7), Vector3(2.0, 2.6, 0), m)
	var head := _box(g, Vector3(0.9, 0.7, 0.6), Vector3(2.4, 3.6, 0), m)
	var legs := []
	for l in [[-1.2, 0.5], [-1.2, -0.5], [1.2, 0.5], [1.2, -0.5]]:
		legs.append(_box(g, Vector3(0.35, 2.0, 0.35), Vector3(l[0], 2.0, l[1]), m, Vector3(0, -1.0, 0)))
	if saddle >= 0:
		var b := _mat(saddle, 0.9)
		_box(g, Vector3(1.9, 0.12, 1.75), Vector3(-0.1, 3.55, 0), b)
		_box(g, Vector3(0.2, 0.28, 0.5), Vector3(0.75, 3.72, 0), b)
	g.set_meta("legs", legs)
	g.set_meta("head", head)
	return g


func set_solid(c: Node3D, on: bool) -> void:
	(c.get_meta("solid") as CollisionShape3D).disabled = not on


func animate_camel(c: Node3D, time: float, speed: float, ph := 0.0) -> void:
	var k := minf(1.0, speed / 1.2)
	var legs: Array = c.get_meta("legs")
	for i in 4:
		legs[i].rotation.z = sin(time * (2.2 + speed * 0.9) + ph + (0.0 if i % 2 else PI) + (0.6 if i > 1 else 0.0)) * 0.32 * k
	(c.get_meta("head") as Node3D).rotation.z = sin(time * 1.6 + ph) * 0.08


func _figure(shirt: int, skin: int, seated: bool) -> Node3D:
	var g := Node3D.new()
	var ty := 0.35 if seated else 1.15
	_box(g, Vector3(0.42, 0.62, 0.26), Vector3(0, ty, 0), _mat(shirt))
	var head := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.12
	sm.height = 0.24
	sm.radial_segments = 8
	sm.rings = 5
	head.mesh = sm
	head.material_override = _mat(skin)
	head.position.y = ty + 0.45
	g.add_child(head)
	_box(g, Vector3(0.27, 0.12, 0.27), Vector3(0, ty + 0.55, 0), _mat(0xf0ece2))
	if not seated:
		for x in [-0.09, 0.09]: _box(g, Vector3(0.17, 0.86, 0.2), Vector3(0, 0.43, x), _mat(shirt))
	return g


# ---- horse carriages and camel rides on the site roads -------------------------
func _carriage(c: Dictionary) -> Node3D:
	var g := Node3D.new()
	var horse := _mat(c["horse"], 0.8)
	_box(g, Vector3(1.8, 0.75, 0.55), Vector3(2.3, 1.45, 0), horse)
	var neck := _box(g, Vector3(0.35, 0.95, 0.32), Vector3(3.2, 1.95, 0), horse)
	neck.rotation.z = -0.5
	_box(g, Vector3(0.62, 0.3, 0.26), Vector3(3.55, 2.35, 0), horse)
	var legs := []
	for l in [[1.6, 0.18], [1.6, -0.18], [3.0, 0.18], [3.0, -0.18]]:
		legs.append(_box(g, Vector3(0.15, 1.1, 0.15), Vector3(l[0], 1.1, l[1]), horse, Vector3(0, -0.55, 0)))
	_box(g, Vector3(0.5, 0.4, 0.62), Vector3(2.8, 1.95, 0), _mat(c["plume"], 0.8))
	_box(g, Vector3(2.2, 0.08, 0.08), Vector3(1.4, 1.25, 0.4), _mat(0x3a2a1a, 0.8))
	_box(g, Vector3(2.2, 0.08, 0.08), Vector3(1.4, 1.25, -0.4), _mat(0x3a2a1a, 0.8))
	_box(g, Vector3(1.7, 0.55, 1.35), Vector3(-0.2, 1.15, 0), _mat(c["cart"], 0.5))
	_box(g, Vector3(1.5, 0.08, 1.45), Vector3(-0.35, 2.45, 0), _mat(0x1d1d1d, 0.6))
	for sz in [-0.62, 0.62]: _box(g, Vector3(0.06, 1.0, 0.06), Vector3(-1.0, 1.9, sz), _mat(0x2a2a2a, 0.8))
	var wheels := []
	for sz in [-0.74, 0.74]:
		var w := Node3D.new()
		w.position = Vector3(-0.2, 0.62, sz)
		var rim := MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = 0.55
		tm.outer_radius = 0.65
		tm.rings = 16
		tm.ring_segments = 6
		rim.mesh = tm
		rim.material_override = _mat(c["wheel"], 0.6)
		rim.rotation.x = PI / 2
		w.add_child(rim)
		for k in 3:
			var sp := _box(w, Vector3(1.15, 0.04, 0.04), Vector3.ZERO, _mat(c["wheel"], 0.6))
			sp.rotation.z = k * PI / 3
		g.add_child(w)
		wheels.append(w)
	var driver := _figure(0xe9e3d6, 0x8d5f3f, true)
	driver.position = Vector3(0.55, 1.4, 0)
	g.add_child(driver)
	g.set_meta("legs", legs)
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
		var route := {"pts": pts, "cum": cum, "len": length}
		for k in maxi(1, roundi(length / 700.0)):
			var g := _carriage(CARRIAGES[(ri + k) % CARRIAGES.size()])
			add_child(g)
			movers.append({"g": g, "r": route, "s": rng.randf() * length * 2.0, "speed": 3.2 + rng.randf() * 1.4, "carriage": true, "ph": rng.randf() * 6.0})
		for k in maxi(1, roundi(length / 900.0)):
			var c := build_camel(SADDLES[k % 4])
			var rider := _figure([0xf2f2f2, 0x2b4f8c, 0xc23b2f, 0xe8c547][(ri + k) % 4], 0xe6c2a0, true)
			rider.position = Vector3(-0.2, 3.62, 0)
			c.add_child(rider)
			var guide := _figure(0x3d5a7a, 0x8d5f3f, false)        # a cameleer leads it
			guide.position = Vector3(3.6, 0, 0.9)
			c.add_child(guide)
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


# ---- visitors who walk (one MultiMesh per body part) ----------------------------
func _part(key: String, mesh: Mesh, n: int) -> void:
	var m := MultiMesh.new()
	m.transform_format = MultiMesh.TRANSFORM_3D
	m.use_colors = true
	m.mesh = mesh
	m.instance_count = n
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.85
	mesh.surface_set_material(0, mat)
	var mi := MultiMeshInstance3D.new()
	mi.multimesh = m
	mi.custom_aabb = AABB(Vector3(-1600, -50, -800), Vector3(2800, 300, 2400))
	add_child(mi)
	mm[key] = m


func _visitors() -> void:
	var total := 0
	for s in SPOTS: total += int(s[3])
	var torso := BoxMesh.new()
	torso.size = Vector3(0.36, 0.68, 0.22)
	var head := SphereMesh.new()
	head.radius = 0.115
	head.height = 0.23
	head.radial_segments = 8
	head.rings = 5
	var leg := BoxMesh.new()
	leg.size = Vector3(0.13, 0.86, 0.15)
	var arm := BoxMesh.new()
	arm.size = Vector3(0.09, 0.6, 0.1)
	_part("torso", torso, total)
	_part("head", head, total)
	_part("legL", leg, total)
	_part("legR", leg.duplicate(), total)
	_part("armL", arm, total)
	_part("armR", arm.duplicate(), total)
	var k := 0
	for sp in SPOTS:
		for i in int(sp[3]):
			var a := rng.randf() * TAU
			var r := sqrt(rng.randf()) * float(sp[2])
			var p := {"sx": float(sp[0]), "sz": float(sp[1]), "sr": float(sp[2]), "x": sp[0] + cos(a) * r, "z": sp[1] + sin(a) * r,
				"wait": rng.randf() * 6.0, "speed": 0.7 + rng.randf() * 0.6, "s": 0.9 + rng.randf() * 0.17, "ph": rng.randf() * 9.0, "yaw": rng.randf() * 6.3}
			p["tx"] = p["x"]
			p["tz"] = p["z"]
			var shirt: int = SHIRTS[rng.randi() % SHIRTS.size()]
			var skin: int = SKINS[rng.randi() % SKINS.size()]
			var trousers: int = TROUSERS[rng.randi() % TROUSERS.size()]
			mm["torso"].set_instance_color(k, rgb(shirt))
			mm["head"].set_instance_color(k, rgb(skin))
			var sleeve := rgb(shirt if rng.randf() < 0.5 else skin)
			mm["armL"].set_instance_color(k, sleeve)
			mm["armR"].set_instance_color(k, sleeve)
			mm["legL"].set_instance_color(k, rgb(trousers))
			mm["legR"].set_instance_color(k, rgb(trousers))
			people.append(p)
			k += 1


func _update_visitors(dt: float, eye: Vector3) -> void:
	for k in people.size():
		var p: Dictionary = people[k]
		# far-off crowds keep still (nobody can see them walk)
		var far := absf(p["sx"] - eye.x) + absf(p["sz"] - eye.z) > 700.0
		if far and p.has("placed"): continue
		p["placed"] = true
		var walk := 0.0
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
				var a := rng.randf() * TAU
				var r := sqrt(rng.randf()) * float(p["sr"])
				p["tx"] = p["sx"] + cos(a) * r
				p["tz"] = p["sz"] + sin(a) * r
			else:
				p["x"] += dx / d * p["speed"] * dt
				p["z"] += dz / d * p["speed"] * dt
				p["yaw"] = atan2(dx, dz)
				walk = 1.0
		var ph: float = t * p["speed"] * 5.2 + p["ph"]
		var sw := sin(ph) * 0.5 * walk
		var y: float = main.terrain_height(p["x"], p["z"]) + absf(cos(ph)) * 0.035 * walk
		var sc: float = p["s"]
		var base := Transform3D(Basis(Vector3.UP, p["yaw"] + look * (1.0 - walk)).scaled(Vector3(sc, sc, sc)), Vector3(p["x"], y, p["z"]))
		mm["torso"].set_instance_transform(k, base * Transform3D(Basis.IDENTITY, Vector3(0, 1.2, 0)))
		mm["head"].set_instance_transform(k, base * Transform3D(Basis.IDENTITY, Vector3(0, 1.67, 0)))
		mm["legL"].set_instance_transform(k, base * Transform3D(Basis(Vector3.RIGHT, sw), Vector3(-0.08, 0.88, 0)) * Transform3D(Basis.IDENTITY, Vector3(0, -0.43, 0)))
		mm["legR"].set_instance_transform(k, base * Transform3D(Basis(Vector3.RIGHT, -sw), Vector3(0.08, 0.88, 0)) * Transform3D(Basis.IDENTITY, Vector3(0, -0.43, 0)))
		mm["armL"].set_instance_transform(k, base * Transform3D(Basis(Vector3.RIGHT, -sw * 0.8), Vector3(-0.24, 1.43, 0)) * Transform3D(Basis.IDENTITY, Vector3(0, -0.3, 0)))
		mm["armR"].set_instance_transform(k, base * Transform3D(Basis(Vector3.RIGHT, sw * 0.8), Vector3(0.24, 1.43, 0)) * Transform3D(Basis.IDENTITY, Vector3(0, -0.3, 0)))


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
		if absf(p.x - eye.x) + absf(p.y - eye.z) > 500.0: continue
		if m["carriage"]:
			var legs: Array = g.get_meta("legs")
			for k in 4: legs[k].rotation.z = sin(t * 7.0 + m["ph"] + (k % 2) * PI + (1.2 if k > 1 else 0.0)) * 0.45
			for w in g.get_meta("wheels"): w.rotation.z -= m["speed"] * dt / 0.6
		else:
			animate_camel(g, t, m["speed"], m["ph"])
	for c in caravan:
		var s: float = (t * 1.1 + c["off"]) / 55.0
		var x := -180.0 + cos(s) * 55.0
		var z := 640.0 + sin(s) * 55.0
		c["g"].position = Vector3(x, main.terrain_height(x, z), z)
		c["g"].rotation.y = -s - PI / 2
		animate_camel(c["g"], t * 1.3, 1.1, c["ph"])
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
