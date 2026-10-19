import bpy
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def mat(name, rgb, rough=.85):
 m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*rgb,1); p.inputs['Roughness'].default_value=rough
 return m
gold=mat('Golden fur',(.61,.30,.09)); cream=mat('Cream white fur',(.88,.78,.61))
pink=mat('Pink',(.72,.35,.35)); dark=mat('Glossy black eyes',(.018,.012,.009),.13)
def ell(name, loc, scale, material, seg=24, rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc)
 o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(material)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bpy.ops.object.shade_smooth(); return o
# Front is -Y, Z up. Prototype geometry; not yet rigged or animated.
ell('Body',(0,.06,.40),(.42,.58,.36),gold,32,24)
ell('Belly',(0,-.12,.25),(.34,.43,.24),cream)
ell('Head',(0,-.43,.58),(.36,.34,.31),gold,32,24)
for sign in [-1,1]:
 ell('Cheek'+str(sign),(.24*sign,-.64,.49),(.18,.19,.17),cream)
 ell('Ear'+str(sign),(.25*sign,-.40,.84),(.13,.075,.15),gold)
 ell('InnerEar'+str(sign),(.25*sign,-.47,.85),(.095,.028,.105),pink)
 ell('Eye'+str(sign),(.205*sign,-.69,.67),(.069,.047,.073),dark)
 for y in [-.31,.39]:
  ell('Paw'+str(sign)+str(y),(.31*sign,y,.105),(.115,.15,.07),pink)
ell('Muzzle',(0,-.72,.43),(.14,.13,.11),cream)
ell('Nose',(0,-.845,.47),(.065,.045,.043),pink)
# Lightweight whiskers and catchlights for mobile rendering.
from mathutils import Vector
whisker=mat('Whiskers',(.28,.22,.17))
shine=mat('Eye highlight',(.95,.92,.82),.18)
def segment(name,start,end):
 a,b=Vector(start),Vector(end); d=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.003,depth=d.length,location=(a+b)*.5)
 ob=bpy.context.object; ob.name=name; ob.rotation_euler=d.to_track_quat('Z','Y').to_euler()
 ob.data.materials.append(whisker)
for sign in (-1,1):
 for index,dz in enumerate((-.06,0,.06)):
  segment('Whisker_%s_%s'%(sign,index),(.13*sign,-.76,.43+dz),(.44*sign,-.80,.38+dz*.5))
 ell('EyeHighlight'+str(sign),(.19*sign,-.731,.699),(.018,.009,.018),shine,12,8)
ell('Tail',(0,.61,.32),(.075,.11,.065),pink)
bpy.ops.wm.save_as_mainfile(filepath='/tmp/hamster.blend')
bpy.ops.export_scene.gltf(filepath='/tmp/hamster.glb',export_format='GLB')
