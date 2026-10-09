from lockup import *
import os
O=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","..","assets","brand")+os.sep
files={
 "iq-monograma.svg":mono(),
 "iq-monograma-tinta.svg":mono(color=INK),
 "iq-monograma-crema.svg":mono(color=CREMA),
 "iq-lockup-horizontal.svg":horizontal("c600"),
 "iq-lockup-horizontal-negativo.svg":horizontal("c600",ink=CREMA),
 "iq-lockup-vertical.svg":vertical("c600"),
 "iq-lockup-vertical-negativo.svg":vertical("c600",ink=CREMA),
 "iq-favicon.svg":favicon(),
 "iq-app-icon.svg":favicon(bg="#0D0D0D"),
}
for n,s in files.items():
    s=s.replace('<svg ','<svg role="img" aria-label="Ibarra Quezada Abogados" ',1)
    open(O+n,"w").write(s+"\n")
