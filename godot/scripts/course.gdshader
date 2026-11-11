// Pyramid core masonry on the stepped courses: UV.x counts blocks along the
// course, UV.y counts courses. Every block gets its own tint; joints are drawn.
shader_type spatial;
render_mode cull_disabled;

uniform vec3 base_color : source_color = vec3(0.74, 0.63, 0.43);
varying vec3 wp;

float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise3(vec3 p) {
	vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	float n = i.x + i.y * 57.0 + i.z * 113.0;
	return mix(mix(mix(hash2(vec2(n, 0.0)), hash2(vec2(n + 1.0, 0.0)), f.x), mix(hash2(vec2(n + 57.0, 0.0)), hash2(vec2(n + 58.0, 0.0)), f.x), f.y),
		mix(mix(hash2(vec2(n + 113.0, 0.0)), hash2(vec2(n + 114.0, 0.0)), f.x), mix(hash2(vec2(n + 170.0, 0.0)), hash2(vec2(n + 171.0, 0.0)), f.x), f.y), f.z);
}

void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }

void fragment() {
	float row = floor(UV.y);
	float u = UV.x + hash2(vec2(row, 3.0)) * 7.0;                   // stagger the bond
	vec2 cell = vec2(floor(u), row);
	float h1 = hash2(cell), h2 = hash2(cell + 5.3), h3 = hash2(cell + 9.1);
	vec3 c = base_color * mix(0.86, 1.1, h1) * (h2 > 0.95 ? 0.8 : 1.0);
	c *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), h3 - 0.5);
	float fu = fract(u), fv = fract(UV.y);
	float joint = max(smoothstep(0.035, 0.0, min(fu, 1.0 - fu)), smoothstep(0.05, 0.0, min(fv, 1.0 - fv)));
	c *= 1.0 - 0.5 * joint;
	c *= 0.9 + 0.2 * noise3(wp * 2.3);                               // weathering
	c = mix(c, vec3(0.7, 0.58, 0.38), smoothstep(5.0, 0.3, wp.y) * 0.0);
	ALBEDO = c;
	ROUGHNESS = 0.95;
}
