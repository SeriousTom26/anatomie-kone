"""Vytvoří stylizovaný 3D výukový model koně (GLB).
Závislost pro generování: pip install trimesh numpy.
Pro samotnou webovou aplikaci není Python potřeba.
Souřadnice modelu: -X = hlava/kraniálně, +X = ocas/kaudálně,
+Y = dorzálně, ±Z = pravá/levá strana.
"""
import os
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

OUT = os.path.join(os.path.dirname(__file__), 'models', 'kun.glb')
scene = trimesh.Scene()
materials = {}
colors = {
    'coat': (166, 106, 72, 255),
    'coat2': (158, 98, 66, 255),
    'muscle': (155, 96, 65, 255),
    'light': (184, 126, 88, 255),
    'muzzle': (161, 113, 90, 255),
    'mane': (52, 40, 34, 255),
    'tail': (68, 48, 37, 255),
    'hooves': (62, 55, 51, 255),
    'eyes': (24, 24, 25, 255),
    'shine': (240, 228, 206, 255),
}
for key, rgba in colors.items():
    materials[key] = PBRMaterial(name=key, baseColorFactor=rgba, metallicFactor=0.0, roughnessFactor=0.88)

def add(m, part, col='coat'):
    m.visual = TextureVisuals(material=materials[col])
    scene.add_geometry(m, geom_name=part)
    return m

def ball(part, center, radius, col='coat', subdivisions=3, rotate=None):
    m = trimesh.creation.icosphere(subdivisions=subdivisions, radius=1)
    m.apply_scale(radius)
    if rotate is not None:
        m.apply_transform(trimesh.transformations.rotation_matrix(rotate[0], rotate[1]))
    m.apply_translation(center)
    return add(m, part, col)

def oval(part, center, dims, col='coat'):
    m = trimesh.creation.uv_sphere(radius=1, count=[28,42])
    m.apply_scale(dims)
    m.apply_translation(center)
    return add(m, part, col)

def stretch(part, a, b, r_a, r_b=None, col='coat', sections=16):
    """Zúžený válec/konický sval nebo kost, lokální osa ve směru A->B."""
    a,b = np.asarray(a,dtype=float),np.asarray(b,dtype=float)
    axis = b-a
    length = float(np.linalg.norm(axis))
    if r_b is None:r_b=r_a
    m = trimesh.creation.cone(radius=r_a, height=length, sections=sections) if r_b == 0 else trimesh.creation.cylinder(radius=1,height=length,sections=sections)
    if r_b != 0:
        # cylinder becomes taper via vertex local Z signs
        v=m.vertices.copy()
        v[:,:2] *= np.where(v[:,2:3]<0,r_a,r_b)
        m.vertices=v
    # axis of cone/cylinder is default z
    trans=trimesh.geometry.align_vectors([0,0,1],axis)
    m.apply_transform(trans)
    m.apply_translation((a+b)*.5)
    return add(m,part,col)

def tube(part, centers, rads, col='coat', sides=20):
    """Organicky spojené kruhové řezy přes 3D křivku."""
    c=np.array(centers,dtype=float)
    vertices=[]
    for i,p in enumerate(c):
        t=c[min(i+1,len(c)-1)]-c[max(i-1,0)]
        t=t/np.linalg.norm(t)
        ref=np.array([0.,0.,1.])
        if abs(np.dot(ref,t))>0.95:ref=np.array([1.,0.,0.])
        a=np.cross(t,ref);a=a/np.linalg.norm(a)
        b=np.cross(t,a)
        for j in range(sides):
            ang=2*np.pi*j/sides
            vertices.append(p+float(rads[i])*(np.cos(ang)*a+np.sin(ang)*b))
    faces=[]
    for i in range(len(c)-1):
        for j in range(sides):
            n=(j+1)%sides
            u=i*sides+j;v=i*sides+n
            faces.extend([[u,v,(i+1)*sides+j],[v,(i+1)*sides+n,(i+1)*sides+j]])
    vertices=np.array(vertices)
    faces.extend([[0,(j+1)%sides,j] for j in range(1,sides-1)])
    tip=(len(c)-1)*sides
    faces.extend([[tip,tip+j,tip+j+1] for j in range(1,sides-1)])
    return add(trimesh.Trimesh(vertices=vertices,faces=faces,process=False),part,col)

def trunk():
    # Organic main barrel, cross-sections in X (elliptical around Y and Z)
    rows=[(-1.02,1.40,.11,.16),(-.88,1.43,.29,.30),(-.65,1.39,.43,.36),(-.30,1.36,.47,.39),(.12,1.39,.44,.40),(.50,1.40,.46,.40),(.80,1.43,.38,.34),(1.01,1.44,.14,.16)]
    v=[];f=[];sides=48
    for x,y,ry,rz in rows:
        for j in range(sides):
            a=j*2*np.pi/sides
            v.append((x,y+ry*np.cos(a),rz*np.sin(a)))
    for i in range(len(rows)-1):
        for j in range(sides):
            k=(j+1)%sides
            a=i*sides+j;b=i*sides+k;c=(i+1)*sides+j;d=(i+1)*sides+k
            f.extend(((a,b,c),(b,d,c)))
    f.extend([(0,j+1,j) for j in range(1,sides-1)])
    a=(len(rows)-1)*sides
    f.extend([(a,a+j,a+j+1) for j in range(1,sides-1)])
    m=trimesh.Trimesh(vertices=v,faces=f,process=False)
    add(m,'Trup koně','coat')

trunk()
# Shape chest and hindquarters (slightly visible surface contours)
oval('Hrudník',(-.64,1.42,0),(.37,.44,.39),'coat')
oval('Záď',(.72,1.44,0),(.38,.40,.35),'coat2')
# Neck flows forward and upward from shoulders. Central tube with widening at root
tube('Krk',[(-.73,1.55,0),(-.91,1.67,0),(-1.05,1.84,0),(-1.19,2.02,0),(-1.31,2.10,0)],[.37,.32,.26,.18,.17],'coat')
oval('Kořen krku',(-.83,1.60,0),(.35,.31,.27),'coat')
# Head inclined toward ground
oval('Hlava',(-1.41,1.95,0),(.21,.31,.18),'coat2')
tube('Nosní hřbet',[(-1.46,1.93,0),(-1.56,1.79,0),(-1.63,1.66,0)],[.17,.155,.14],'coat2')
oval('Čenich',(-1.65,1.63,0),(.20,.13,.175),'muzzle')
oval('Spodní pysk',(-1.67,1.54,0),(.135,.050,.13),'muzzle')
# Nostrils on both sides; sleek dark flattened ovals
for zsgn in [-1,1]:
    s='L' if zsgn<0 else 'P'
    oval('Nozdra '+s,(-1.773,1.67,zsgn*.095),(.041,.025,.027),'mane')
    oval('Oko '+s,(-1.465,2.040,zsgn*.176),(.049,.036,.014),'eyes')
    ball('Odlesk oka '+s,(-1.476,2.051,zsgn*.188),(.009,.009,.009),'shine',2)
    # pointy ears with inner shadow
    tube('Ucho '+s,[(-1.33,2.17,zsgn*.085),(-1.34,2.28,zsgn*.102),(-1.37,2.39,zsgn*.11)],[.08,.055,.005],'coat2',12)
    # slender mane stream following crest of neck (on either side)
    for i in range(6):
        x=-.88-i*.083
        y=1.90+i*.055
        tube('Pramen hřívy '+s+str(i),[(x,y,zsgn*.050),(x+.067,y-.025,zsgn*.08),(x+.09,y-.13,zsgn*.10)],[.040,.027,.003],'mane',8)
# Main mane cap
for i in range(8):
    x=-.79-i*.075;y=1.91+i*.043
    stretch('Hříva '+str(i),(x,y,0),(x+.10,y-.15,0),.055,.005,'mane',9)
# Shoulder joints, four distinct limbs
for front in [True,False]:
  for sgn in [-1,1]:
    name=('Přední' if front else 'Zadní')+(' levá' if sgn<0 else ' pravá')
    z=sgn*.266
    if front:
      oval('Plece '+name,(-.67,1.20,z),(.23,.32,.16),'muscle')
      tube('Horní část '+name,[(-.68,1.26,z),(-.73,1.10,z),(-.76,.81,z),(-.73,.67,z)],[.19,.135,.102,.090],'coat',18)
      oval('Karpus '+name,(-.73,.66,z),(.104,.113,.099),'coat2')
      tube('Metakarpus '+name,[(-.73,.66,z),(-.75,.49,z),(-.75,.24,z),(-.74,.13,z)],[.081,.067,.057,.067],'coat',16)
      oval('Spěnka '+name,(-.74,.145,z),(.09,.10,.09),'light')
      oval('Kopyto '+name,(-.79,.065,z),(.158,.073,.124),'hooves')
    else:
      oval('Kyčel '+name,(.73,1.38,z),(.29,.36,.22),'coat2')
      tube('Stehno '+name,[(.78,1.37,z),(.86,1.15,z),(.75,.90,z),(.66,.77,z)],[.22,.20,.14,.09],'coat2',18)
      oval('Hlezno '+name,(.86,.68,z),(.101,.09,.088),'coat2')
      tube('Zadní bérec '+name,[(.70,.80,z),(.87,.69,z),(.78,.48,z),(.74,.29,z),(.74,.13,z)],[.093,.085,.065,.054,.067],'coat',16)
      oval('Spěnka '+name,(.74,.145,z),(.09,.10,.09),'light')
      oval('Kopyto '+name,(.76,.066,z),(.165,.073,.137),'hooves')
# Tail extends behind rump and flows down
tube('Kořen ocasu',[(.99,1.56,0),(1.11,1.48,0),(1.18,1.29,0),(1.24,1.10,0)],[.105,.085,.075,.05],'tail',18)
for i in range(11):
    off=(i-5)*.020
    tube('Žíně ocasu '+str(i),[(1.17,1.33,off*.50),(1.20+off*.5,1.09,off),(1.28+off*.8,.82,off*1.5),(1.29+off*.8,.68,off*1.2)],[.028,.028,.017,.004],'tail',8)

# Rotate? no; scene exported in right handed Y-up coordinates
os.makedirs(os.path.dirname(OUT),exist_ok=True)
with open(OUT,'wb') as f:f.write(scene.export(file_type='glb'))
print('Created', OUT,os.path.getsize(OUT),'bytes, meshes',len(scene.geometry))
print('Bounds',scene.bounds)
