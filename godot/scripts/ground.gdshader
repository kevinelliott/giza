// The plateau's ground: procedural sand, tinted by the Sentinel-2 colour
// ratio (ground.jpg), with roads and tracks painted from the mapped road
// network (roads.png: R = paved, G = track), and bare rock on steep slopes.
shader_type spatial;
render_mode cull_disabled;

uniform sampler2D ground_tex : filter_linear;
uniform sampler2D roads_tex : filter_linear_mipmap;
uniform vec4 extent;              // x0, z0, width, depth

varying vec3 wp;
varying vec3 wn;

float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
	vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return noise2(p) * 0.5 + noise2(p * 2.1) * 0.3 + noise2(p * 4.3) * 0.2; }

void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wn = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec2 g = (wp.xz - extent.xy) / extent.zw;
	// wind ripples (fine), dune tone (broad), gravel spreads
	float ripple = sin((wp.x * 0.86 + wp.z * 0.5) * 9.0 + fbm(wp.xz * 0.6) * 5.0) * 0.5 + 0.5;
	float grain = noise2(wp.xz * 28.0);
	float tonal = fbm(wp.xz * 0.012 + 11.0);
	float gravel = smoothstep(0.55, 0.8, fbm(wp.xz * 0.05 + 3.0));
	float near = smoothstep(90.0, 12.0, distance(wp, CAMERA_POSITION_WORLD));
	ripple = mix(0.5, ripple, near);
	vec3 c = vec3(0.80, 0.70, 0.55) * (0.9 + 0.1 * ripple) * (0.93 + 0.14 * grain) * mix(0.86, 1.1, tonal);
	c = mix(c, c * vec3(0.72, 0.68, 0.62), gravel * 0.7);
	vec3 ratio = texture(ground_tex, g).rgb * 2.0;
	c *= mix(vec3(1.0), ratio, 0.55);
	vec2 rm = texture(roads_tex, g).rg;
	float road = smoothstep(0.3, 0.65, rm.r);
	c = mix(c, vec3(0.1, 0.095, 0.09) * (0.82 + 0.3 * noise2(wp.xz * 0.8)), road);
	c *= mix(1.0, 0.84, smoothstep(0.25, 0.6, rm.g));
	float steep = smoothstep(0.94, 0.74, wn.y);
	c = mix(c, vec3(0.36, 0.29, 0.2) * (0.8 + 0.4 * tonal), steep * 0.8);
	ALBEDO = pow(c, vec3(2.2));       // the palette above is sRGB
	ROUGHNESS = mix(1.0, 0.85, road);
	NORMAL_MAP = vec3(0.5 + (ripple - 0.5) * 0.12 * (1.0 - road), 0.5 + (grain - 0.5) * 0.1, 1.0);
}
