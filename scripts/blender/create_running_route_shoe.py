"""Build an original, unbranded performance running shoe and export it as GLB.

The checked-in script is the reproducible source for the website hero asset.
Run with the isolated official Blender Python module used by this project:
  /tmp/thai-pace-bpy.cduNbg/bin/python scripts/blender/create_running_route_shoe.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "public" / "models" / "run-route-shoe.glb"
RENDER_PATH = ROOT / "artifacts" / "blender" / "running-route-shoe.png"
BLEND_PATH = ROOT / "artifacts" / "blender" / "running-route-shoe.blend"

COLORS = {
    "ink": (0.014, 0.035, 0.09, 1.0),
    "blue": (0.035, 0.16, 0.68, 1.0),
    "red": (0.78, 0.025, 0.09, 1.0),
    "white": (0.94, 0.92, 0.86, 1.0),
    "gold": (0.95, 0.67, 0.18, 1.0),
    "route": (0.07, 0.32, 0.9, 1.0),
    "ground": (0.88, 0.89, 0.88, 1.0),
}


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.curves,
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(name: str, color, metallic: float = 0.0, roughness: float = 0.45):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in shader.inputs:
        shader.inputs["Coat Weight"].default_value = 0.22
        shader.inputs["Coat Roughness"].default_value = 0.3
    return mat


def add_bevel(obj, width: float, segments: int = 3) -> None:
    bevel = obj.modifiers.new("Soft performance edge", "BEVEL")
    bevel.width = width
    bevel.segments = segments


def make_loft(name: str, sections, bottom_z, top_z, mat, collection):
    vertices = []
    faces = []
    for index, (x, width) in enumerate(sections):
        lower = bottom_z[index] if isinstance(bottom_z, (list, tuple)) else bottom_z
        upper = top_z[index] if isinstance(top_z, (list, tuple)) else top_z
        vertices.extend([
            (x, -width, lower),
            (x, width, lower),
            (x, width, upper),
            (x, -width, upper),
        ])
        if index:
            previous = (index - 1) * 4
            current = index * 4
            faces.extend([
                (previous, current, current + 1, previous + 1),
                (previous + 1, current + 1, current + 2, previous + 2),
                (previous + 2, current + 2, current + 3, previous + 3),
                (previous + 3, current + 3, current, previous),
            ])
    last = (len(sections) - 1) * 4
    faces.extend([(0, 1, 2, 3), (last, last + 3, last + 2, last + 1)])
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    add_bevel(obj, 0.055, 4)
    return obj


def make_upper(name: str, sections, mats, collection):
    cross_steps = 12
    vertices = []
    faces = []
    for x, width, base, crown in sections:
        for step in range(cross_steps + 1):
            fraction = -1.0 + step * 2.0 / cross_steps
            y = fraction * width
            z = base + crown * (max(0.0, 1.0 - fraction * fraction) ** 0.58)
            vertices.append((x, y, z))

    row = cross_steps + 1
    for longitudinal in range(len(sections) - 1):
        for cross in range(cross_steps):
            start = longitudinal * row + cross
            faces.append((start, start + row, start + row + 1, start + 1))

    # Close the heel and toe while leaving the sole-side seam visually light.
    faces.append(tuple(range(row - 1, -1, -1)))
    toe = (len(sections) - 1) * row
    faces.append(tuple(toe + index for index in range(row)))

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    for mat in mats:
        mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    for polygon in mesh.polygons:
        polygon.use_smooth = True
        center_x = sum(mesh.vertices[index].co.x for index in polygon.vertices) / len(polygon.vertices)
        if center_x > 1.18:
            polygon.material_index = 1
        elif center_x < -1.1:
            polygon.material_index = 2
        else:
            polygon.material_index = 0
    add_bevel(obj, 0.035, 3)
    return obj


def add_cube(name: str, location, scale, mat, collection, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    add_bevel(obj, min(scale) * 0.28, 3)
    return obj


def add_curve(name: str, points, depth: float, mat, collection):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = depth
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    curve.materials.append(mat)
    return obj


def add_cylinder(name: str, radius: float, depth: float, location, mat, collection, vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    add_bevel(obj, min(radius * 0.18, depth * 0.25), 3)
    return obj


def build_shoe():
    collection = bpy.data.collections.new("Original Running Shoe")
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new("Running Shoe Root", None)
    collection.objects.link(root)

    mats = {
        "ink": material("Carbon outsole", COLORS["ink"], 0.05, 0.32),
        "blue": material("Thai blue knit", COLORS["blue"], 0.02, 0.48),
        "red": material("Thai red toe", COLORS["red"], 0.02, 0.42),
        "white": material("Warm white foam", COLORS["white"], 0.0, 0.56),
        "gold": material("Gold lace", COLORS["gold"], 0.18, 0.35),
    }

    outsole_sections = [
        (-2.0, 0.42), (-1.68, 0.62), (-0.9, 0.69), (0.05, 0.66),
        (0.9, 0.75), (1.62, 0.68), (2.05, 0.42),
    ]
    outsole = make_loft(
        "Road grip outsole",
        outsole_sections,
        [-0.12, -0.14, -0.13, -0.11, -0.08, -0.02, 0.08],
        [0.02, 0.03, 0.04, 0.07, 0.1, 0.17, 0.23],
        mats["ink"],
        collection,
    )

    midsole_sections = [
        (-1.94, 0.4), (-1.64, 0.59), (-0.88, 0.65), (0.08, 0.62),
        (0.91, 0.71), (1.58, 0.63), (1.98, 0.39),
    ]
    midsole = make_loft(
        "Responsive foam midsole",
        midsole_sections,
        [0.0, 0.01, 0.03, 0.06, 0.09, 0.16, 0.22],
        [0.34, 0.37, 0.36, 0.36, 0.38, 0.43, 0.45],
        mats["white"],
        collection,
    )

    upper_sections = [
        (-1.7, 0.47, 0.34, 0.38),
        (-1.35, 0.54, 0.36, 0.72),
        (-0.72, 0.58, 0.36, 0.8),
        (0.02, 0.57, 0.37, 0.72),
        (0.76, 0.62, 0.4, 0.58),
        (1.38, 0.55, 0.43, 0.4),
        (1.82, 0.34, 0.46, 0.18),
    ]
    upper = make_upper("Breathable upper", upper_sections, [mats["blue"], mats["red"], mats["ink"]], collection)

    # A clear open heel collar, tongue and real crossed laces make the silhouette read as footwear.
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.39,
        minor_radius=0.085,
        major_segments=64,
        minor_segments=16,
        location=(-1.35, 0.0, 0.94),
        rotation=(0.0, math.radians(90), 0.0),
    )
    collar = bpy.context.object
    collar.name = "Padded heel collar"
    collar.scale = (1.0, 1.0, 0.72)
    for owner in list(collar.users_collection):
        owner.objects.unlink(collar)
    collection.objects.link(collar)
    collar.data.materials.append(mats["ink"])

    tongue = add_cube(
        "Running tongue",
        (-0.35, 0.0, 1.04),
        (0.62, 0.31, 0.07),
        mats["white"],
        collection,
        rotation=(0.0, math.radians(-17), 0.0),
    )
    tongue.rotation_euler.z = math.radians(2)

    lace_x = (-0.74, -0.45, -0.15, 0.16, 0.47)
    for index, x in enumerate(lace_x):
        height = 1.13 - (x + 0.4) * 0.12
        add_curve(
            f"Cross lace {index + 1}",
            [(x - 0.1, -0.38, height), (x, 0.0, height + 0.08), (x + 0.1, 0.38, height)],
            0.027,
            mats["gold"],
            collection,
        )

    # Small geometric side vents are functional details, not a brand mark.
    for index, x in enumerate((-0.56, -0.2, 0.18)):
        vent = add_cube(
            f"Side vent {index + 1}",
            (x, -0.585, 0.7 - index * 0.035),
            (0.2, 0.022, 0.035),
            mats["white"],
            collection,
            rotation=(0.0, math.radians(-9), math.radians(-19)),
        )
        vent.rotation_euler.x = math.radians(8)

    heel_clip = add_cube(
        "Red heel stabiliser",
        (-1.61, 0.0, 0.52),
        (0.18, 0.58, 0.08),
        mats["red"],
        collection,
        rotation=(0.0, math.radians(-18), 0.0),
    )

    # Tread pods communicate road-running performance from low angles.
    for index, x in enumerate((-1.42, -0.65, 0.18, 0.94, 1.53)):
        width = 0.43 + 0.09 * (index % 2)
        pod = add_cube(
            f"Tread pod {index + 1}",
            (x, 0.0, -0.14 + 0.055 * index),
            (0.24, width, 0.035),
            mats["ink"],
            collection,
            rotation=(0.0, math.radians(-4), 0.0),
        )

    for obj in collection.objects:
        if obj is not root:
            obj.parent = root

    return collection, root, mats


def export_glb(collection) -> None:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.all_objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(MODEL_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
    )
    bpy.ops.object.select_all(action="DESELECT")


def add_area(name: str, location, energy: float, color, size: float, target=(0.0, 0.0, 0.35)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
    return obj


def prepare_preview(mats, root) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.color = (0.82, 0.84, 0.86)

    root.rotation_euler = (math.radians(2), math.radians(-5), math.radians(-7))
    root.location = (0.0, 0.0, 0.12)

    ground_mat = material("Preview ground", COLORS["ground"], 0.0, 0.7)
    route_mat = material("Preview route", COLORS["route"], 0.08, 0.4)
    start_mat = material("Start marker", COLORS["red"], 0.03, 0.35)
    finish_mat = material("Finish marker", COLORS["gold"], 0.16, 0.35)

    bpy.ops.mesh.primitive_plane_add(size=18, location=(0.0, 0.0, -0.22))
    ground = bpy.context.object
    ground.name = "Preview city ground"
    ground.data.materials.append(ground_mat)

    route_points = [
        (-3.5, -1.4, -0.17), (-2.1, -1.8, -0.17), (-0.5, -1.55, -0.17),
        (1.5, -1.05, -0.17), (3.1, -0.12, -0.17), (3.6, 1.25, -0.17),
    ]
    route = add_curve("Preview start to finish route", route_points, 0.065, route_mat, scene.collection)

    start = add_cylinder("START", 0.18, 0.07, route_points[0], start_mat, scene.collection)
    start.rotation_euler.x = math.radians(90)
    finish = add_cylinder("FINISH", 0.23, 0.07, route_points[-1], finish_mat, scene.collection)
    finish.rotation_euler.x = math.radians(90)

    # Minimal finish gate, deliberately simple enough to read at website scale.
    add_cube("Finish post left", (3.38, 1.0, 0.45), (0.04, 0.04, 0.65), mats["ink"], scene.collection)
    add_cube("Finish post right", (3.82, 1.48, 0.45), (0.04, 0.04, 0.65), mats["ink"], scene.collection)
    add_cube("Finish bar", (3.6, 1.24, 1.08), (0.31, 0.04, 0.04), finish_mat, scene.collection, rotation=(0.0, 0.0, math.radians(47)))

    camera_data = bpy.data.cameras.new("Preview camera")
    camera = bpy.data.objects.new("Preview camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (5.4, -7.6, 3.35)
    camera.rotation_euler = (Vector((0.15, 0.0, 0.43)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 52
    scene.camera = camera

    add_area("Large softbox", (-3.5, -4.0, 6.5), 1050, (1.0, 0.95, 0.88), 5.5)
    add_area("Blue edge", (4.5, 2.5, 4.0), 800, (0.24, 0.43, 1.0), 4.0)
    add_area("Red fill", (-4.0, 3.0, 2.5), 560, (1.0, 0.16, 0.2), 3.2)

    scene.view_settings.look = "AgX - Medium High Contrast"
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)


def main() -> None:
    reset_scene()
    collection, root, mats = build_shoe()
    export_glb(collection)
    prepare_preview(mats, root)
    print(f"Exported {MODEL_PATH}")
    print(f"Rendered {RENDER_PATH}")
    print(f"Saved {BLEND_PATH}")


if __name__ == "__main__":
    main()
