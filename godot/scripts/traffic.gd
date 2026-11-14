extends Node3D
## Road traffic, on the mapped roads only (data/world.json "roads", built by
## tools/geo/build_roadnet.py from OpenStreetMap):
##   public streets outside the antiquities fence — cars, taxis, microbuses,
##     tuk-tuks, pickups and city buses, keeping to the right as Egypt does;
##   paved roads inside the fence — only the electric hop-on hop-off visitor buses (cars, taxis and
##     tour coaches have been kept out since April 2025; coaches wait in the parks outside).
## Footpaths, tracks and open desert carry no vehicles at all. Also: cars
## parked along the side streets, and street lamps on the larger ones.
## Vehicles are drawn as MultiMeshes (models: tools/blender/vehicles.py).

const TYPES := {
	# name: [length, share on public streets, min rank, max rank, speed factor, paint2 colour]
	"car": [4.4, 0.42, 0, 9, 1.0, 0x111111], "taxi": [4.4, 0.16, 0, 9, 1.0, 0x0c0c0c], "microbus": [4.9, 0.15, 1, 9, 1.0, 0x111111],
	"tuktuk": [2.65, 0.12, 0, 2, 0.7, 0xd9b21a], "pickup": [5.0, 0.09, 0, 9, 0.9, 0x111111], "bus": [11.8, 0.06, 2, 9, 0.8, 0xb8262a],
	"coach": [12.2, 0.04, 2, 9, 0.75, 0x1f4f9a], "shuttle": [10.5, 0.0, 0, 9, 0.8, 0x121212],
}
const PAINTS := [0xe8e8e6, 0xe8e8e6, 0xc9ccd0, 0x9a9da2, 0x2b2d31, 0x101113, 0x7a1f1f, 0x1f3f7a, 0xb9a98a, 0x6b6f5a]

var main: Node
var edges := []                 # {pts, cum, len, kind, rank, hw, speed, a, b}
var nodes := {}                 # key -> [[edge index, end 0/1]]
var cars := []                  # {type, i, e, dir, s, v, yaw, col}
var mm := {}                    # type -> MultiMesh (moving)
var counts := {}
var lane := {}                  # "edge:dir" -> [car indices]
var lamp_head: StandardMaterial3D
var lamp_f: StandardMaterial3D
var rng := RandomNumberGenerator.new()
var walkers := []               # people on the pavements: {g, e, dir, s, speed, side}


static func rgb(h: int) -> Color:
	return Color8((h >> 16) & 255, (h >> 8) & 255, h & 255)


func _key(p: Vector2) -> Vector2i:
	return Vector2i(roundi(p.x * 2.0), roundi(p.y * 2.0))


func setup(main_node: Node, world: Dictionary) -> void:
	main = main_node
	rng.seed = 21
	for r in world["roads"]:
		var pts := PackedVector2Array()
		for i in range(4, r.size(), 2): pts.append(Vector2(r[i], r[i + 1]))
		var cum := PackedFloat32Array([0.0])
		for i in range(1, pts.size()): cum.append(cum[i - 1] + pts[i].distance_to(pts[i - 1]))
		var e := {"pts": pts, "cum": cum, "len": cum[cum.size() - 1], "kind": int(r[0]), "rank": int(r[1]), "hw": float(r[2]), "speed": float(r[3]),
			"a": _key(pts[0]), "b": _key(pts[pts.size() - 1])}
		var k := edges.size()
		edges.append(e)
		for end in 2:
			var nk: Vector2i = e["a"] if end == 0 else e["b"]
			if not nodes.has(nk): nodes[nk] = []
			nodes[nk].append([k, end])
	var meshes := _meshes()
	# how many of each: about one moving vehicle per 230 m of street, a shuttle or coach per 1.1 km of site road
	var pub := 0.0
	var site := 0.0
	for e in edges:
		if e["kind"] == 0: pub += e["len"]
		else: site += e["len"]
	var plan := []
	for t in TYPES:
		for i in roundi(pub / 230.0 * TYPES[t][1]): plan.append([t, 0])
	for i in roundi(site / 1100.0):
		plan.append(["shuttle", 1])        # since April 2025 only the electric visitor buses run inside the site: no cars, taxis or coaches
	for p in plan:
		var e := _random_edge(p[1], TYPES[p[0]][2], TYPES[p[0]][3])
		if e < 0: continue
		var paint: int = PAINTS[rng.randi() % PAINTS.size()]
		if p[0] in ["taxi", "microbus", "bus", "coach"]: paint = 0xf0f0ee
		if p[0] == "shuttle": paint = 0xd08a24      # amber-gold, from the 2022 press photograph of the fleet
		if p[0] == "tuktuk": paint = 0x15161a
		counts[p[0]] = counts.get(p[0], 0) + 1
		cars.append({"type": p[0], "i": counts[p[0]] - 1, "e": e, "dir": 1 if rng.randf() < 0.5 else -1, "s": rng.randf() * edges[e]["len"],
			"v": 0.0, "yaw": 0.0, "col": rgb(paint), "site": p[1], "init": false})
	for t in counts:
		var m := MultiMesh.new()
		m.transform_format = MultiMesh.TRANSFORM_3D
		m.use_colors = true
		m.mesh = meshes[t]
		m.instance_count = counts[t]
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = m
		mi.custom_aabb = AABB(Vector3(-1600, -80, -800), Vector3(2800, 300, 2400))
		add_child(mi)
		mm[t] = m
	for c in cars: mm[c["type"]].set_instance_color(c["i"], c["col"])
	_parked(meshes)
	_lamps(world.get("lamps", []))
	_walkers(roundi(pub / 420.0))


# One mesh per vehicle, with our own materials: "paint" takes the instance colour.
func _meshes() -> Dictionary:
	var out := {}
	var scene: PackedScene = load("res://models/vehicles.glb")
	var root := scene.instantiate()
	var paint := StandardMaterial3D.new()
	paint.vertex_color_use_as_albedo = true
	paint.roughness = 0.38
	paint.metallic = 0.25
	var glass := StandardMaterial3D.new()
	glass.albedo_color = Color(0.05, 0.07, 0.09)
	glass.roughness = 0.1
	glass.metallic = 0.5
	lamp_f = StandardMaterial3D.new()
	lamp_f.albedo_color = Color(1.0, 0.97, 0.85)
	lamp_f.emission_enabled = true
	lamp_f.emission = Color(1.0, 0.95, 0.8)
	lamp_f.emission_energy_multiplier = 0.0
	for n in root.find_children("*", "MeshInstance3D", true, false):
		var t := String(n.name)
		if not TYPES.has(t): continue
		var mesh: Mesh = (n as MeshInstance3D).mesh.duplicate()
		for s in mesh.get_surface_count():
			var src := mesh.surface_get_material(s)
			var nm := src.resource_name if src != null else ""
			if nm == "paint": mesh.surface_set_material(s, paint)
			elif nm == "glass": mesh.surface_set_material(s, glass)
			elif nm == "lamp_f": mesh.surface_set_material(s, lamp_f)
			elif nm == "paint2":
				var p2 := StandardMaterial3D.new()
				p2.albedo_color = rgb(TYPES[t][5])
				p2.roughness = 0.5
				mesh.surface_set_material(s, p2)
		out[t] = mesh
	root.free()
	return out


func _random_edge(kind: int, rmin: int, rmax: int) -> int:
	for attempt in 60:
		var k := rng.randi() % edges.size()
		var e: Dictionary = edges[k]
		if e["kind"] == kind and e["rank"] >= rmin and e["rank"] <= rmax and e["len"] > 12.0: return k
	return -1


func _at(e: Dictionary, d: float) -> Array:       # point and unit direction (a -> b) at distance d from a
	var cum: PackedFloat32Array = e["cum"]
	var pts: PackedVector2Array = e["pts"]
	var i := 1
	while i < cum.size() - 1 and cum[i] < d: i += 1
	var a := pts[i - 1]
	var b := pts[i]
	var u := clampf((d - cum[i - 1]) / maxf(1e-6, cum[i] - cum[i - 1]), 0.0, 1.0)
	return [a.lerp(b, u), (b - a).normalized()]


func _pose(c: Dictionary) -> Array:               # world x/z of the vehicle and its heading, in its right-hand lane
	var e: Dictionary = edges[c["e"]]
	var d: float = c["s"] if c["dir"] > 0 else e["len"] - c["s"]
	var a := _at(e, d)
	var dirv: Vector2 = a[1] * float(c["dir"])
	var right := Vector2(-dirv.y, dirv.x)          # x east, z south: right of east is south
	var off := minf(e["hw"] * 0.5, 1.7)
	return [a[0] + right * off, dirv]


func _next(c: Dictionary) -> void:                # at the end of a street: pick the next one this vehicle may use
	var e: Dictionary = edges[c["e"]]
	var nk: Vector2i = e["b"] if c["dir"] > 0 else e["a"]
	var t: Array = TYPES[c["type"]]
	var opts := []
	var weights := []
	for o in nodes[nk]:
		var ne: Dictionary = edges[o[0]]
		if o[0] == c["e"] or ne["kind"] != c["site"]: continue
		if ne["rank"] < t[2] or ne["rank"] > t[3]: continue
		opts.append(o)
		weights.append(1.0 + ne["rank"] * 1.5)
	if opts.is_empty():                            # dead end, or nothing it may enter: turn round
		c["dir"] = -c["dir"]
		c["s"] = 0.0
		c["v"] = 0.0
		return
	var total := 0.0
	for w in weights: total += w
	var pick: float = rng.randf() * total
	var k := 0
	while k < opts.size() - 1 and pick > weights[k]:
		pick -= weights[k]
		k += 1
	c["e"] = opts[k][0]
	c["dir"] = 1 if opts[k][1] == 0 else -1
	c["s"] = 0.0


func update(dt: float, eye: Vector3, night: float) -> void:
	lamp_f.emission_energy_multiplier = 3.0 * night
	lamp_head.emission_energy_multiplier = 4.0 * night
	update_walkers(dt, eye)
	lane.clear()
	for k in cars.size():
		var c: Dictionary = cars[k]
		var lk: int = c["e"] * 2 + (1 if c["dir"] > 0 else 0)
		if not lane.has(lk): lane[lk] = []
		lane[lk].append(k)
	for k in cars.size():
		var c: Dictionary = cars[k]
		var e: Dictionary = edges[c["e"]]
		var t: Array = TYPES[c["type"]]
		var vmax: float = e["speed"] * t[4]
		var left: float = e["len"] - c["s"]
		if left < 9.0: vmax = minf(vmax, 3.5 + left * 0.3)            # slow for the junction
		var gap := 1e9                                              # the vehicle ahead in this lane
		for j in lane[c["e"] * 2 + (1 if c["dir"] > 0 else 0)]:
			if j == k: continue
			var ds: float = cars[j]["s"] - c["s"]
			if ds > 0.0: gap = minf(gap, ds - (TYPES[cars[j]["type"]][0] + t[0]) * 0.5)
		var target := vmax if gap > 30.0 else clampf((gap - 2.5) * 0.7, 0.0, vmax)
		c["v"] = move_toward(c["v"], target, (2.0 if target > c["v"] else 6.0) * dt)
		c["s"] += c["v"] * dt
		if c["s"] >= e["len"]: _next(c)
		var pose := _pose(c)
		var p: Vector2 = pose[0]
		var far := absf(p.x - eye.x) + absf(p.y - eye.z)
		if far > 1400.0 and c["init"]: continue
		c["init"] = true
		var d: Vector2 = pose[1]
		var yaw := atan2(-d.y, d.x)
		c["yaw"] = lerp_angle(c["yaw"], yaw, minf(1.0, dt * 5.0)) if far < 600.0 else yaw
		var half: float = t[0] * 0.4
		var hf: float = main.terrain_height(p.x + d.x * half, p.y + d.y * half)
		var hb: float = main.terrain_height(p.x - d.x * half, p.y - d.y * half)
		var basis := Basis(Vector3.UP, c["yaw"]) * Basis(Vector3(0, 0, 1), atan2(hf - hb, half * 2.0))
		mm[c["type"]].set_instance_transform(c["i"], Transform3D(basis, Vector3(p.x, (hf + hb) * 0.5 + 0.02, p.y)))


# ---- cars parked along the side streets (right-hand kerb, facing the way they would drive) -------
func _parked(meshes: Dictionary) -> void:
	var slots := {"car": [], "pickup": [], "microbus": [], "taxi": []}
	for e in edges:
		if e["kind"] != 0 or e["rank"] > 2 or e["len"] < 30.0: continue
		for dirn in [1, -1]:
			var d := 8.0 + rng.randf() * 20.0
			while d < e["len"] - 8.0:
				if rng.randf() < 0.55:
					var a := _at(e, d)
					var dirv: Vector2 = a[1] * float(dirn)
					var right := Vector2(-dirv.y, dirv.x)
					var p: Vector2 = a[0] + right * (float(e["hw"]) + 0.2)
					var r := rng.randf()
					var t := "car" if r < 0.7 else ("pickup" if r < 0.82 else ("microbus" if r < 0.93 else "taxi"))
					var y: float = main.terrain_height(p.x, p.y)
					slots[t].append([Transform3D(Basis(Vector3.UP, atan2(-dirv.y, dirv.x) + (rng.randf() - 0.5) * 0.08), Vector3(p.x, y + 0.02, p.y)),
						rgb(0xf0f0ee if t in ["microbus", "taxi"] else PAINTS[rng.randi() % PAINTS.size()])])
				d += 6.5 + rng.randf() * 22.0
	for t in slots:
		var m := MultiMesh.new()
		m.transform_format = MultiMesh.TRANSFORM_3D
		m.use_colors = true
		m.mesh = meshes[t]
		m.instance_count = slots[t].size()
		for i in slots[t].size():
			m.set_instance_transform(i, slots[t][i][0])
			m.set_instance_color(i, slots[t][i][1])
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = m
		add_child(mi)


# ---- street lamps: a pole, an arm over the road and a head that glows at night ----------------------
func _lamps(list: Array) -> void:
	lamp_head = StandardMaterial3D.new()
	lamp_head.albedo_color = Color(0.9, 0.9, 0.85)
	lamp_head.emission_enabled = true
	lamp_head.emission = Color(1.0, 0.82, 0.55)
	lamp_head.emission_energy_multiplier = 0.0
	var steel := StandardMaterial3D.new()
	steel.albedo_color = Color(0.42, 0.44, 0.45)
	steel.roughness = 0.6
	steel.metallic = 0.4
	var pole := CylinderMesh.new()
	pole.top_radius = 0.06
	pole.bottom_radius = 0.1
	pole.height = 8.0
	pole.radial_segments = 6
	pole.rings = 1
	pole.material = steel
	var arm := BoxMesh.new()
	arm.size = Vector3(1.8, 0.07, 0.07)
	arm.material = steel
	var head := BoxMesh.new()
	head.size = Vector3(0.7, 0.1, 0.26)
	head.material = lamp_head
	var parts := [[pole, Vector3(0, 4.0, 0)], [arm, Vector3(0.85, 8.0, 0)], [head, Vector3(1.6, 7.93, 0)]]
	for part in parts:
		var m := MultiMesh.new()
		m.transform_format = MultiMesh.TRANSFORM_3D
		m.mesh = part[0]
		m.instance_count = list.size()
		for i in list.size():
			var l: Array = list[i]
			var y: float = main.terrain_height(l[0], l[1])
			var b := Basis(Vector3.UP, -deg_to_rad(l[2]))           # local +X points along the heading (atan2(z, x))
			m.set_instance_transform(i, Transform3D(b, Vector3(l[0], y, l[1]) + b * part[1]))
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = m
		add_child(mi)


# ---- townspeople walking along the edges of the streets ---------------------------------------------
const W_SHIRTS := [0xf2f2f2, 0x2b4f8c, 0xc23b2f, 0x1e1e1e, 0xe8c547, 0x6fa36a, 0x8a6b4a, 0xb0b0b0]
const W_ROBES := [0xd8d2c2, 0x4a5a6a, 0x7a6a55, 0xe9e3d6, 0x5a5a66, 0x1c1c1e]

func _walkers(n: int) -> void:
	var life: Node = main.life
	for i in n:
		var e := _random_edge(0, 0, 3)
		if e < 0: continue
		var local := rng.randf() < 0.45
		var g: Node3D = life._person({"shirt": W_SHIRTS[rng.randi() % W_SHIRTS.size()], "robe": W_ROBES[rng.randi() % W_ROBES.size()],
			"trousers": [0x2a3550, 0x1e1e1e, 0x5a5a5a, 0x3a3a44][rng.randi() % 4], "skin": [0xc99d78, 0x8d5f3f, 0xa8754f][rng.randi() % 3],
			"hair": 0x15100c, "scarf": [0xf0ece2, 0x1c1c1e, 0x7a2a3a, 0x2a4a6a][rng.randi() % 4]}, ["robe", "scarf"] if local else [], "walk")
		var h := 0.9 + rng.randf() * 0.15
		g.scale = Vector3(h, h, h)
		add_child(g)
		walkers.append({"g": g, "e": e, "dir": 1 if rng.randf() < 0.5 else -1, "s": rng.randf() * edges[e]["len"], "speed": 1.05 + rng.randf() * 0.45,
			"side": 1.0 if rng.randf() < 0.5 else -1.0})


func update_walkers(dt: float, eye: Vector3) -> void:
	var life: Node = main.life
	for w in walkers:
		var e: Dictionary = edges[w["e"]]
		w["s"] += w["speed"] * dt
		if w["s"] >= e["len"]:                                   # carry on along another street, or turn back
			var nk: Vector2i = e["b"] if w["dir"] > 0 else e["a"]
			var opts := []
			for o in nodes[nk]:
				if o[0] != w["e"] and edges[o[0]]["kind"] == 0 and edges[o[0]]["rank"] <= 3: opts.append(o)
			if opts.is_empty(): w["dir"] = -w["dir"]
			else:
				var o: Array = opts[rng.randi() % opts.size()]
				w["e"] = o[0]
				w["dir"] = 1 if o[1] == 0 else -1
			w["s"] = 0.0
			e = edges[w["e"]]
		var d: float = w["s"] if w["dir"] > 0 else e["len"] - w["s"]
		var a := _at(e, d)
		var dirv: Vector2 = a[1] * float(w["dir"])
		var p: Vector2 = a[0] + Vector2(-dirv.y, dirv.x) * w["side"] * (float(e["hw"]) + 1.1)
		var g: Node3D = w["g"]
		var far := absf(p.x - eye.x) + absf(p.y - eye.z)
		g.visible = far < 700.0
		(g.get_meta("ap") as AnimationPlayer).active = far < 220.0
		if not g.visible: continue
		# where a house stands right at the kerb, walk in the edge of the road instead of through its wall
		if far < 220.0 and life._blocked(p.x, p.y):
			p = a[0] + Vector2(-dirv.y, dirv.x) * w["side"] * (float(e["hw"]) - 0.5)
			if life._blocked(p.x, p.y):            # the mapped street itself runs under a building here: out of sight until past it
				g.visible = false
				continue
		g.position = Vector3(p.x, main.terrain_height(p.x, p.y), p.y)
		g.rotation.y = atan2(-dirv.y, dirv.x)
		life._play(g, "walk", w["speed"] / 1.5)
