"""Original generic café props, in metres. Uses the venue's existing rig and materials.

Manufactured vessels have thickness and rounded rims. No equipment brand or measured
product is implied. Food is ambientCG CC0, static styling outside the stock model.
"""
import bpy, bmesh, math, os
from mathutils import Vector

def lathe(api,name,profile,X,Y,Z,material,segments=40,spout=0):
    bm=bmesh.new(); rings=[]
    for r,h in profile:
        if r==0: rings.append([bm.verts.new((0,0,h))]);continue
        ring=[]
        for i in range(segments):
            angle=2*math.pi*i/segments
            # Pouring lip toward -X; blend smoothly only into the upper third.
            lip=spout*max(0,-math.cos(angle))**18*max(0,(h-.065)/.04)
            ring.append(bm.verts.new(((r+lip)*math.cos(angle),r*math.sin(angle),h+lip*.25)))
        rings.append(ring)
    for a,b in zip(rings,rings[1:]):
        for i in range(segments):
            j=(i+1)%segments
            if len(a)==1: bm.faces.new((a[0],b[i],b[j]))
            elif len(b)==1: bm.faces.new((a[i],b[0],a[j]))
            else: bm.faces.new((a[i],b[i],b[j],a[j]))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    obj=api['mesh_obj'](name,bm,api['M'][material],loc=api['P'](X,Y,Z))
    for face in obj.data.polygons: face.use_smooth=True
    return obj

def cup(api,name,X,Y,Z):
    profile=[(0,0),(.024,0),(.027,.002),(.027,.005),(.029,.007),(.033,.015),(.038,.047),(.041,.060),(.041,.064),(.039,.066),(.037,.064),(.036,.060),(.034,.047),(.029,.015),(.026,.011),(0,.011)]
    body=lathe(api,name,profile,X,Y,Z,'white',32)
    pts=[(X+.033+.025*math.sin(math.pi*i/16),Y+.052-.036*i/16,Z) for i in range(17)]
    handle=api['tube'](name+'_handle',pts,.004,'white')
    return [body,handle]

def pitcher(api,name,X,Y,Z):
    profile=[(0,0),(.032,0),(.038,.002),(.040,.006),(.041,.018),(.039,.058),(.037,.100),(.037,.104),(.036,.106),(.0345,.104),(.0345,.100),(.0365,.058),(.0385,.018),(.037,.006),(.032,.004),(0,.004)]
    body=lathe(api,name,profile,X,Y,Z,'steel',40,spout=.016)
    pts=[(X+.038,Y+.092,Z),(X+.057,Y+.089,Z),(X+.063,Y+.075,Z),(X+.063,Y+.028,Z),(X+.054,Y+.019,Z),(X+.041,Y+.022,Z)]
    return [body,api['tube'](name+'_handle',pts,.0035,'steel')]

def espresso_details(api,prefix,X,Y,Z,s):
    box,cyl,tube=api['box'],api['cyl'],api['tube']; pieces=[]
    # Front removable control panel, rear ventilation slots and panel fasteners.
    pieces.append(box('service_face',.76,.24,.009,X,Y+.30,Z+s*.254,'steel',.012,seg=3))
    pieces.append(box('rear_panel',.72,.26,.012,X,Y+.26,Z-s*.255,'powder',.018,seg=3))
    for i in range(17):
        pieces.append(box('rear_vent',.019,.080,.002,X-.27+i*.034,Y+.27,Z-s*.262,'char',.003,seg=2))
    for x in [-.34,.34]:
        for y in [.16,.36]:
            pieces.append(cyl('panel_screw',.004,.004,.003,X+x,Y+y,Z-s*.263,'steel',12,axis='Z'))
            pieces.append(box('screw_slot',.004,.0008,.0005,X+x,Y+y,Z-s*.265,'char',0))
    # Real gauge markings and a needle, above the dial face toward the barista.
    for gx in [-.12,.12]:
        for i in range(11):
            a=math.radians(-140+i*28)
            pts=[(X+gx+math.sin(a)*r,Y+.36+math.cos(a)*r,Z+s*.266) for r in [.031,.037]]
            pieces.append(tube('gauge_tick',pts,.0007,'char',seg=4))
        pieces.append(tube('gauge_needle',[(X+gx,Y+.36,Z+s*.267),(X+gx-.018,Y+.381,Z+s*.267)],.001,'navy',seg=4))
        pieces.append(cyl('gauge_hub',.003,.003,.002,X+gx,Y+.36,Z+s*.269,'steel',12,axis='Z'))
    return pieces

def barista_tools(api,parent,FY):
    box,cyl,tube,join=api['box'],api['cyl'],api['tube'],api['join']
    parts=[box('knockbox_base',.14,.012,.18,2.75,FY+1.061,1,'char',.004,seg=2)]
    for x in [-.065,.065]:parts.append(box('knockbox_side',.01,.095,.18,2.75+x,FY+1.106,1,'char',.004,seg=2))
    for z in [-.085,.085]:parts.append(box('knockbox_end',.12,.095,.01,2.75,FY+1.106,1+z,'char',.004,seg=2))
    parts.append(cyl('knockbar_rubber',.011,.011,.145,2.75,FY+1.138,1,'char',20,axis='X'))
    for j,jx in enumerate([2.42,2.56]):parts+=pitcher(api,f'milk_pitcher_{j}',jx,FY+1.055,.95)
    parts.append(cyl('tamper_base',.029,.029,.009,2.99,FY+1.060,.94,'steel',32))
    parts.append(lathe(api,'tamper_grip',[(0,0),(.01,0),(.012,.008),(.014,.025),(.020,.042),(.018,.048),(.009,.052),(0,.052)],2.99,FY+1.065,.94,'oak',24))
    join('BARISTA_TOOLS',parts,parent,twin_part='coffee')

def scan_mesh(path,width,name):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=path)
    imported=[o for o in bpy.data.objects if o not in before]
    meshes=[o for o in imported if o.type=='MESH']
    if len(meshes)!=1:raise ValueError('Expected one scanned food mesh')
    obj=meshes[0];mesh=obj.data.copy();mesh.transform(obj.matrix_world)
    lo=Vector(tuple(min(v.co[a] for v in mesh.vertices) for a in range(3)))
    hi=Vector(tuple(max(v.co[a] for v in mesh.vertices) for a in range(3)))
    scale=width/max(hi.x-lo.x,hi.y-lo.y);centre=(lo+hi)/2
    for v in mesh.vertices:
        v.co=Vector(((v.co.x-centre.x)*scale,(v.co.y-centre.y)*scale,(v.co.z-lo.z)*scale))
    mesh.name=name
    for material in mesh.materials:
        for node in material.node_tree.nodes:
            if node.type=='TEX_IMAGE' and node.image:node.image.pack()
    for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
    return mesh

def display_food(api,parent,FY,HERE):
    # One physical jar and a platter. Styling only: no menu identity or stock node is changed.
    base=FY+1.055;jarX,jarZ=2.22,1.35
    jar=lathe(api,'COOKIE_JAR',[(0,0),(.047,0),(.053,.004),(.055,.012),(.055,.137),(.051,.147),(.047,.149),(.047,.158),(.045,.160),(.043,.158),(.043,.148),(.048,.143),(.052,.134),(.052,.013),(.048,.007),(0,.007)],jarX,base,jarZ,'glass',48)
    lid=lathe(api,'COOKIE_JAR_LID',[(0,.159),(.048,.159),(.050,.162),(.050,.166),(.048,.169),(.016,.172),(.010,.177),(.011,.185),(.007,.190),(0,.190)],jarX,base,jarZ,'glass',48)
    for o in [jar,lid]:o.parent=parent;o['twin_part']='coffee';o['role']='static architectural styling'
    cookie=scan_mesh(os.path.join(HERE,'cookie-browser.glb'),.062,'cookie_ambientcg_3DCookie001')
    height=max(v.co.z for v in cookie.vertices)
    for i in range(5):
        obj=bpy.data.objects.new(f'DISPLAY_COOKIE_{i}',cookie);api['link'](obj);obj.parent=parent
        obj.location=api['P'](jarX+.003*math.sin(i*2),base+.008+i*height,jarZ+.004*math.cos(i*2))
        obj.rotation_euler.z=i*1.7;obj['twin_part']='coffee';obj['source']='https://ambientcg.com/view?id=3DCookie001';obj['licence']='CC0-1.0';obj['role']='static styling, not simulated stock'
    tray=lathe(api,'PASTRY_PLATTER',[(0,0),(.07,0),(.075,.003),(.12,.008),(.145,.018),(.15,.022),(.15,.027),(.146,.030),(.14,.027),(.12,.015),(.09,.010),(0,.010)],1.77,base,1.25,'white',48)
    tray.scale.y=.72;tray.parent=parent;tray['twin_part']='coffee'
    pastry=scan_mesh(os.path.join(HERE,'croissant-browser.glb'),.18,'croissant_ambientcg_3DPastry001')
    for i in range(2):
        obj=bpy.data.objects.new(f'DISPLAY_CROISSANT_{i}',pastry);api['link'](obj);obj.parent=parent
        obj.location=api['P'](1.76+i*.018,base+.012,1.20+i*.095)
        obj.rotation_euler.z=(-.16 if i==0 else .17);obj['twin_part']='coffee';obj['source']='https://ambientcg.com/view?id=3DPastry001';obj['licence']='CC0-1.0';obj['role']='static styling, not simulated stock'
