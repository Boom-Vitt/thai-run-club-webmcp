"""Build the original Thai Pace Sculpture, export GLB, and render four frames.

Run with the official Blender Python module:
  python scripts/blender/create_thai_pace_sculpture.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "public" / "models" / "thai-pace-sculpture.glb"
RENDER_DIR = ROOT / "artifacts" / "blender" / "renders"
BLEND_PATH = ROOT / "artifacts" / "blender" / "thai-pace-sculpture.blend"

COLORS = {
    "navy": (0.012, 0.035, 0.11, 1.0),
    "blue": (0.025, 0.16, 0.78, 1.0),
    "red": (0.86, 0.018, 0.065, 1.0),
    "white": (0.93, 0.90, 0.82, 1.0),
    "gold": (0.86, 0.59, 0.16, 1.0),
    "ink": (0.003, 0.012, 0.05, 1.0),
}


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.curves, bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(name: str, color: tuple[float, float, float, float], metallic: float, roughness: float, emission: float = 0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in shader.inputs:
        shader.inputs["Coat Weight"].default_value = 0.48
        shader.inputs["Coat Roughness"].default_value = 0.18
    if emission and "Emission Color" in shader.inputs:
        shader.inputs["Emission Color"].default_value = color
        shader.inputs["Emission Strength"].default_value = emission
    return mat


def cubic(points: list[Vector], t: float) -> Vector:
    inv = 1.0 - t
    return (
        points[0] * (inv ** 3)
        + points[1] * (3.0 * inv * inv * t)
        + points[2] * (3.0 * inv * t * t)
        + points[3] * (t ** 3)
    )


def cubic_tangent(points: list[Vector], t: float) -> Vector:
    inv = 1.0 - t
    tangent = (
        (points[1] - points[0]) * (3.0 * inv * inv)
        + (points[2] - points[1]) * (6.0 * inv * t)
        + (points[3] - points[2]) * (3.0 * t * t)
    )
    return tangent.normalized()


def make_blade(name: str, controls, width: float, depth: float, mat, collection, twist: float = 0.0):
    points = [Vector(point) for point in controls]
    segments = 72
    vertices = []
    faces = []
    for index in range(segments + 1):
        t = index / segments
        center = cubic(points, t)
        tangent = cubic_tangent(points, t)
        side = Vector((-tangent.z, 0.0, tangent.x)).normalized()
        if side.length < 0.01:
            side = Vector((1.0, 0.0, 0.0))
        angle = twist * (t - 0.5)
        side = (side * math.cos(angle) + Vector((0.0, 1.0, 0.0)) * math.sin(angle)).normalized()
        thickness_axis = tangent.cross(side).normalized()
        profile = 0.12 + 0.88 * (math.sin(math.pi * t) ** 0.48)
        local_width = width * profile
        local_depth = depth * (0.72 + 0.28 * profile)
        vertices.extend([
            center + side * local_width * 0.5 + thickness_axis * local_depth * 0.5,
            center - side * local_width * 0.5 + thickness_axis * local_depth * 0.5,
            center - side * local_width * 0.5 - thickness_axis * local_depth * 0.5,
            center + side * local_width * 0.5 - thickness_axis * local_depth * 0.5,
        ])
        if index:
            start = (index - 1) * 4
            current = index * 4
            for edge in range(4):
                nxt = (edge + 1) % 4
                faces.append((start + edge, start + nxt, current + nxt, current + edge))
    faces.extend([(0, 3, 2, 1), (segments * 4, segments * 4 + 1, segments * 4 + 2, segments * 4 + 3)])
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    bevel = obj.modifiers.new("Soft machined edge", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 3
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def make_route_arc(name: str, radius: float, start: float, end: float, z: float, mat, collection, depth: float = 0.025):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = depth
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    count = 80
    spline.points.add(count - 1)
    for index, point in enumerate(spline.points):
        angle = start + (end - start) * index / (count - 1)
        point.co = (math.cos(angle) * radius, math.sin(angle) * radius * 0.58, z, 1.0)
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    curve.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj


def add_mesh_primitive(collection, operator, name: str, mat, **kwargs):
    operator(**kwargs)
    obj = bpy.context.object
    obj.name = name
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def point_camera(camera, target: tuple[float, float, float]) -> None:
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def add_area(name: str, location, energy: float, color, size: float, target=(0.0, 0.0, 0.2)):
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


def build_sculpture():
    sculpture = bpy.data.collections.new("Thai Pace Sculpture")
    bpy.context.scene.collection.children.link(sculpture)
    root = bpy.data.objects.new("Thai Pace Sculpture Root", None)
    sculpture.objects.link(root)

    mats = {
        "navy": material("Pace core / deep navy", COLORS["navy"], 0.72, 0.22),
        "blue": material("Thai blue blade", COLORS["blue"], 0.38, 0.22),
        "red": material("Thai red blade", COLORS["red"], 0.42, 0.2),
        "white": material("Warm white blade", COLORS["white"], 0.18, 0.3),
        "gold": material("Route gold", COLORS["gold"], 0.82, 0.2, 0.08),
        "ink": material("Carbon plinth", COLORS["ink"], 0.55, 0.28),
    }

    core = add_mesh_primitive(
        sculpture,
        bpy.ops.mesh.primitive_ico_sphere_add,
        "Faceted pace core",
        mats["navy"],
        subdivisions=4,
        radius=1.0,
        location=(0.0, 0.04, 0.18),
    )
    core.scale = (0.48, 0.34, 0.76)
    core.rotation_euler = (math.radians(5), math.radians(-13), math.radians(-17))

    make_blade(
        "Red forward stride",
        [(-1.28, -0.10, -1.18), (-0.92, -0.22, 0.02), (0.32, -0.20, 1.18), (1.26, 0.02, 1.98)],
        0.36,
        0.13,
        mats["red"],
        sculpture,
        twist=0.72,
    )
    make_blade(
        "White lift stride",
        [(0.78, 0.22, -1.22), (0.12, 0.26, -0.18), (-0.44, 0.18, 1.12), (0.02, -0.02, 2.22)],
        0.31,
        0.115,
        mats["white"],
        sculpture,
        twist=-0.58,
    )
    make_blade(
        "Blue return stride",
        [(-0.98, 0.08, -1.08), (0.20, 0.0, -0.84), (1.32, -0.08, 0.18), (0.54, -0.05, 1.56)],
        0.42,
        0.14,
        mats["blue"],
        sculpture,
        twist=0.48,
    )

    make_route_arc("Gold route arc", 1.42, math.radians(18), math.radians(324), -0.9, mats["gold"], sculpture, 0.024)
    make_route_arc("Navy route arc", 1.73, math.radians(192), math.radians(514), -1.12, mats["navy"], sculpture, 0.055)

    plinth = add_mesh_primitive(
        sculpture,
        bpy.ops.mesh.primitive_cylinder_add,
        "Low elliptical plinth",
        mats["ink"],
        vertices=96,
        radius=1.0,
        depth=0.12,
        location=(0.0, 0.0, -1.26),
    )
    plinth.scale = (1.65, 1.0, 1.0)
    bevel = plinth.modifiers.new("Plinth bevel", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 4

    for index, angle in enumerate((28, 124, 212, 308)):
        radians = math.radians(angle)
        marker = add_mesh_primitive(
            sculpture,
            bpy.ops.mesh.primitive_cone_add,
            f"Route waypoint {index + 1}",
            mats["gold"],
            vertices=4,
            radius1=0.095,
            radius2=0.0,
            depth=0.18,
            location=(math.cos(radians) * 1.58, math.sin(radians) * 0.92, -1.08),
            rotation=(0.0, 0.0, radians + math.pi / 4),
        )
        marker.rotation_euler.x = math.radians(18)

    for obj in sculpture.objects:
        if obj is not root:
            obj.parent = root

    return sculpture, root, mats


def export_glb(sculpture) -> None:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in sculpture.all_objects:
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


def prepare_render(mats):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = bpy.data.worlds.new("Midnight studio")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.002, 0.008, 0.035, 1.0)
    background.inputs["Strength"].default_value = 0.2

    camera_data = bpy.data.cameras.new("Editorial camera")
    camera_data.lens = 58
    camera = bpy.data.objects.new("Editorial camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    backdrop_mat = material("Studio midnight", (0.004, 0.018, 0.075, 1.0), 0.1, 0.6)
    bpy.ops.mesh.primitive_plane_add(size=18, location=(0.0, 2.6, 1.8), rotation=(math.pi / 2, 0.0, 0.0))
    backdrop = bpy.context.object
    backdrop.name = "Midnight backdrop"
    backdrop.data.materials.append(backdrop_mat)

    bpy.ops.mesh.primitive_plane_add(size=18, location=(0.0, 0.0, -1.35))
    floor = bpy.context.object
    floor.name = "Midnight floor"
    floor.data.materials.append(backdrop_mat)

    stripe_specs = [
        (COLORS["red"], -0.24, 0.07),
        (COLORS["white"], -0.07, 0.055),
        (COLORS["blue"], 0.08, 0.11),
        (COLORS["white"], 0.23, 0.055),
        (COLORS["red"], 0.38, 0.07),
    ]
    for index, (color, z, height) in enumerate(stripe_specs):
        stripe_mat = material(f"Backdrop stripe {index}", color, 0.2, 0.32, 0.06)
        bpy.ops.mesh.primitive_cube_add(location=(0.0, 2.48, z - 1.04), scale=(5.2, 0.025, height))
        stripe = bpy.context.object
        stripe.name = f"Thai signal stripe {index + 1}"
        stripe.data.materials.append(stripe_mat)

    add_area("Warm key", (-3.8, -4.2, 5.6), 1050, (1.0, 0.88, 0.72), 4.2)
    add_area("Blue edge", (4.8, -1.0, 2.8), 920, (0.09, 0.2, 1.0), 3.2)
    add_area("Red edge", (-4.6, 0.5, 0.7), 760, (1.0, 0.035, 0.045), 2.8)
    add_area("Gold top", (0.6, 1.0, 6.0), 560, (1.0, 0.55, 0.16), 2.2)
    return camera


def render_frames(camera, sculpture_root) -> None:
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    positions = [
        ((3.9, -7.2, 2.7), (0.0, 0.0, 0.26), -8.0),
        ((-4.5, -6.8, 2.2), (0.0, 0.0, 0.18), 18.0),
        ((5.2, -5.5, 3.8), (0.0, 0.0, 0.30), -22.0),
        ((0.2, -7.8, 4.5), (0.0, 0.0, 0.34), 32.0),
    ]
    scene = bpy.context.scene
    for index, (location, target, rotation) in enumerate(positions, start=1):
        camera.location = location
        point_camera(camera, target)
        sculpture_root.rotation_euler.z = math.radians(rotation)
        scene.render.filepath = str(RENDER_DIR / f"thai-pace-{index:02d}.png")
        bpy.ops.render.render(write_still=True)


def main() -> None:
    reset_scene()
    sculpture, sculpture_root, mats = build_sculpture()
    export_glb(sculpture)
    camera = prepare_render(mats)
    render_frames(camera, sculpture_root)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"GLB: {MODEL_PATH}")
    print(f"Renders: {RENDER_DIR}")
    print(f"Blend: {BLEND_PATH}")


if __name__ == "__main__":
    main()
