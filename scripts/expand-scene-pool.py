"""Download explicitly selected freely licensed Commons photographs, with provenance.
No search result thumbnail is treated as a licence. Individual metadata is checked
before downloading; the exported WebP retains the original licence in the credits.
"""
import json, urllib.request, urllib.parse, re, html, io
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
ROOT=Path(__file__).resolve().parent.parent
CHOICES=[
 ('Représentation de Ruy Blas dans les Arènes de Montmartre.JPG','theatre','Ruy Blas dans les Arènes de Montmartre'),
 ('Street theatre 1, Rue de Steinkerque - Boulevard de Rochechouart, Paris.jpg','rue','Théâtre de rue à Paris, rue de Steinkerque'),
 ('Jongleur Spanien Circus Balls.JPG','cirque','Ives Nicols · numéro de jonglage aux balles'),
 ('Fanfare du Château Genève 2009.jpg','musique','Fanfare du Château · Journée internationale de la Paix, Genève, 2009'),
 ("Célébration du carnaval à l'aide de marionnettes géantes.jpg",'collectif','Marionnettes géantes pendant une célébration de carnaval'),
 ('Anatomia - Compagnia Simona Bertozzi. Nexus.jpg','danse','Anatomia · Compagnia Simona Bertozzi / Nexus'),
]
def get(url):
    request=urllib.request.Request(url,headers={'User-Agent':'CompagnieCraft/1.0 (free theatre resource; source credit retained)'})
    with urllib.request.urlopen(request,timeout=45) as r:return r.read()
def plain(value):return html.unescape(re.sub('<[^>]*>','',value or '')).strip()
if __name__=='__main__':
    query=urllib.parse.urlencode({'action':'query','format':'json','prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':960,'titles':'|'.join('File:'+x[0] for x in CHOICES)})
    pages=json.loads(get('https://commons.wikimedia.org/w/api.php?'+query))['query']['pages']
    pages={p['title']:p for p in pages.values()}
    rows=[]
    for i,(title,group,caption) in enumerate(CHOICES,1):
        p=pages.get('File:'+title);info=(p or {}).get('imageinfo',[{}])[0];meta=info.get('extmetadata',{});license=plain(meta.get('LicenseShortName',{}).get('value'))
        if license not in ['CC BY-SA 4.0','CC BY-SA 3.0','CC BY-SA 2.0','CC BY 4.0','CC BY 3.0','CC BY 2.0','CC0']:
            print('SKIP licence:',title,license);continue
        url=info.get('thumburl') or info['url'];image=ImageOps.exif_transpose(Image.open(io.BytesIO(get(url)))).convert('RGB');image.thumbnail((960,1400))
        filename='scene-new-'+str(i)+'.webp';dest=ROOT/'dist/assets/scenes-libres'/filename;image.save(dest,'WEBP',quality=83,method=6)
        row={'id':'scene-new-'+str(i),'group':group,'src':'assets/scenes-libres/'+filename,'alt':caption,'caption':caption,'credit':plain(meta.get('Artist',{}).get('value')),'license':license,'licenseUrl':meta.get('LicenseUrl',{}).get('value'),'source':info['descriptionurl'],'title':title,'position':'50% 35%'};rows.append(row)
        print(json.dumps({'title':title,'credit':row['credit'],'license':license,'size':dest.stat().st_size},ensure_ascii=False))
    (ROOT/'banner-photo-additions.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    sheet=Image.new('RGB',(len(rows)*220,330),'white');draw=ImageDraw.Draw(sheet)
    for i,row in enumerate(rows):
        image=Image.open(ROOT/'dist'/row['src']);image=ImageOps.fit(image,(220,290));sheet.paste(image,(i*220,0));draw.text((i*220+6,298),row['id'],fill='black')
    sheet.save(ROOT/'verification-nouvelles-photos.jpg')
