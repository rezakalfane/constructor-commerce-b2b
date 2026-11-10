"""Five blog posts about the batteries the shop actually sells (EN + FR), for scripts/amplience/add_posts.py.

Same shape as POSTS in content.py: (title, intro, (heading, text), (heading, text), [key takeaways]).
`author` indexes AUTHORS (0 = Priya Raman, 1 = Marcus Oyelaran); `image` is the guide photo (already uploaded) to reuse; `date` is ISO.
Sample copy: general guidance, always check the vehicle or equipment manufacturer's specification.
"""

POSTS_BATTERIES = [
    {
        "author": 0,
        "image": "b2b-guide-how-to-choose-a-car-battery-agm-efb-or-standa",
        "date": "2026-09-21",
        "en": (
            "AGM, EFB or Flooded: Which Battery Fits a Start-Stop Vehicle?",
            "Start-stop systems switch the engine off at every junction and restart it dozens of times a trip. A battery that was fine in an older car can fail within months in a newer one, and the wrong replacement is one of the most common reasons a vehicle comes back to the workshop.",
            ("What changes with start-stop", "A start-stop vehicle asks much more of its battery. It restarts the engine many more times, it runs the electrics while the engine is off, and it often recovers energy when braking, which means the battery is charged in short, irregular bursts. A standard flooded battery is built for a single, strong start, then steady charging. Under start-stop duty it loses capacity quickly because its plates are stressed by repeated partial discharge."),
            ("Choosing between AGM and EFB", "Enhanced flooded batteries (EFB) are the entry level for start-stop: they keep the familiar flooded construction but cope with far more charge cycles than a standard battery. Absorbent glass mat (AGM) batteries hold the electrolyte in glass fibre, which makes them sealed, spill resistant and the most tolerant of deep, repeated discharge and heavy electrical loads. As a rule, fit what the vehicle was built with, or step up from EFB to AGM, and never step down: an AGM-equipped car with a standard battery will usually trigger warnings and age the charging system."),
            ["Check whether the vehicle has start-stop before quoting a replacement", "Match the technology: AGM for AGM, EFB or AGM for EFB, never a standard battery", "Match size, capacity and terminal layout too, not just the technology"],
        ),
        "fr": (
            "AGM, EFB ou batterie standard : laquelle pour un véhicule Start-Stop ?",
            "Les systèmes Start-Stop coupent le moteur à chaque feu rouge et le redémarrent des dizaines de fois par trajet. Une batterie parfaitement adaptée à un ancien modèle peut lâcher en quelques mois sur un véhicule récent, et un mauvais remplacement est l'une des premières causes de retour à l'atelier.",
            ("Ce que change le Start-Stop", "Un véhicule Start-Stop sollicite bien davantage sa batterie. Elle relance le moteur beaucoup plus souvent, alimente l'électronique moteur coupé et se recharge souvent par à-coups, par exemple en récupérant l'énergie du freinage. Une batterie standard est conçue pour un démarrage puissant puis une recharge régulière. En usage Start-Stop, elle perd vite de la capacité car ses plaques souffrent des décharges partielles répétées."),
            ("Choisir entre AGM et EFB", "Les batteries EFB (à électrolyte liquide renforcé) sont le niveau d'entrée du Start-Stop : même construction qu'une batterie classique, mais bien plus de cycles de charge. Les batteries AGM retiennent l'électrolyte dans un matelas de fibre de verre : elles sont étanches, sans risque de fuite et les plus tolérantes aux décharges profondes et aux fortes charges électriques. En règle générale, montez la technologie d'origine, ou passez de l'EFB à l'AGM, jamais l'inverse : un véhicule équipé d'AGM avec une batterie standard déclenche souvent des alertes et fatigue le système de charge."),
            ["Vérifier la présence du Start-Stop avant de chiffrer un remplacement", "Respecter la technologie : AGM pour AGM, EFB ou AGM pour EFB, jamais une batterie standard", "Contrôler aussi la taille, la capacité et la position des bornes"],
        ),
    },
    {
        "author": 0,
        "image": "b2b-guide-how-to-choose-a-car-battery-agm-efb-or-standa",
        "date": "2026-09-14",
        "en": (
            "Reading a Battery Label: Ah, CCA and EN Explained",
            "A battery label packs a lot into a few lines: 12V 60Ah 680A. Customers ask what the numbers mean, and counter staff need to compare two batteries quickly without being misled by a bigger number that measures something different.",
            ("Capacity and cranking are different questions", "Ampere-hours (Ah) describe capacity: how much energy the battery can deliver over time, normally at a 20-hour rate. It matters for accessories, stop-start duty and how long the battery lasts when the engine is off. Cold cranking current describes starting power: how many amps the battery can deliver for a few seconds at low temperature. It matters on a cold morning with a large engine. A battery can have a high Ah and a modest cranking figure, or the other way round."),
            ("EN and CCA are not the same scale", "Cranking current is quoted under different standards. European EN figures and North American CCA figures use different test conditions, so a battery rated 700 A (EN) is not directly comparable with one rated 700 CCA. Compare like with like. After the numbers, check the physical details that decide whether it fits: the size code, the terminal layout (positive on the left or right) and the hold-down type. A correct rating in the wrong case is still the wrong battery."),
            ["Ah is capacity, cranking amps are starting power", "Compare EN with EN and CCA with CCA", "Always confirm size code, terminal layout and hold-down before the rating"],
        ),
        "fr": (
            "Lire l'étiquette d'une batterie : Ah, CCA et EN expliqués",
            "L'étiquette d'une batterie condense beaucoup d'informations en quelques lignes : 12V 60Ah 680A. Les clients demandent ce que signifient ces chiffres, et le comptoir doit comparer deux batteries rapidement, sans se laisser tromper par un chiffre plus grand qui mesure autre chose.",
            ("Capacité et démarrage sont deux questions différentes", "Les ampères-heures (Ah) décrivent la capacité : l'énergie que la batterie peut fournir dans la durée, en général sur 20 heures. Elle compte pour les accessoires, l'usage Start-Stop et l'autonomie moteur coupé. Le courant de démarrage à froid décrit la puissance de démarrage : les ampères délivrés pendant quelques secondes à basse température. Il compte par temps froid avec un gros moteur. Une batterie peut avoir beaucoup d'Ah et un courant de démarrage modeste, ou l'inverse."),
            ("EN et CCA ne sont pas la même échelle", "Le courant de démarrage est indiqué selon des normes différentes. Les valeurs européennes EN et les valeurs nord-américaines CCA reposent sur des conditions d'essai différentes : une batterie à 700 A (EN) n'est pas directement comparable à une batterie à 700 CCA. Comparez ce qui est comparable. Ensuite, vérifiez ce qui décide de la compatibilité physique : le code de taille, la position des bornes (positif à gauche ou à droite) et le type de fixation. Une bonne valeur dans un mauvais bac reste la mauvaise batterie."),
            ["Les Ah sont la capacité, les ampères de démarrage la puissance de démarrage", "Comparer EN avec EN et CCA avec CCA", "Toujours vérifier le code de taille, les bornes et la fixation avant la valeur"],
        ),
    },
    {
        "author": 1,
        "image": "b2b-guide-truck-and-commercial-batteries-a-fleet-buyer-",
        "date": "2026-09-28",
        "en": (
            "Keeping Fleet Batteries Alive Through the Winter",
            "Most no-start calls arrive in the first cold week of the year. A battery that coped all summer is suddenly asked to deliver more current from a chemistry that has become sluggish, and the weakest batteries in a fleet all fail together.",
            ("Why cold weather finds the weak battery", "Cold slows the chemical reaction inside a lead-acid battery, so it delivers less current, while a cold engine is stiffer and needs more current to turn over. A battery that has lost part of its capacity to age, short trips or deep discharge can look fine in summer and fail at the first frost. Vehicles that do short, stop-and-go runs, or that sit for days between jobs, never fully recharge and are the first to go."),
            ("A simple pre-winter routine", "Test every battery before the cold, not after the first failure. Measure the resting voltage (a healthy, fully charged 12 V battery sits around 12.6 to 12.8 V; 12.4 V is about three quarters charged) and run a load test where you can. Clean and tighten the terminals, check the charging output, and put a smart charger on vehicles that stand. Keep a record of fitting dates, and plan to replace batteries that are four or five years old before winter rather than after it. Staggering replacements also avoids a whole fleet ageing out in the same week."),
            ["Test resting voltage and load before the first frost", "Smart-charge vehicles that stand idle or run short trips", "Replace batteries at four to five years on a schedule, and stagger them"],
        ),
        "fr": (
            "Garder les batteries d'une flotte en forme tout l'hiver",
            "La plupart des appels pour véhicule qui ne démarre pas arrivent la première semaine de froid. Une batterie qui a tenu tout l'été doit soudain fournir plus de courant avec une chimie ralentie, et les batteries les plus faibles d'une flotte lâchent toutes en même temps.",
            ("Pourquoi le froid révèle la batterie faible", "Le froid ralentit la réaction chimique d'une batterie au plomb, qui délivre moins de courant, alors qu'un moteur froid est plus dur à lancer et demande davantage de courant. Une batterie qui a perdu une partie de sa capacité à cause de l'âge, des trajets courts ou des décharges profondes peut sembler correcte l'été et lâcher à la première gelée. Les véhicules qui font de courts trajets, ou qui restent immobiles plusieurs jours entre deux missions, ne se rechargent jamais complètement et sont les premiers touchés."),
            ("Une routine simple avant l'hiver", "Testez chaque batterie avant le froid, pas après la première panne. Mesurez la tension au repos (une batterie 12 V saine et chargée se situe autour de 12,6 à 12,8 V ; 12,4 V correspond à environ trois quarts de charge) et faites un test en charge quand c'est possible. Nettoyez et resserrez les bornes, vérifiez la charge de l'alternateur et branchez un chargeur intelligent sur les véhicules qui stationnent. Gardez la date de pose de chaque batterie et planifiez le remplacement de celles de quatre ou cinq ans avant l'hiver plutôt qu'après. Échelonner les remplacements évite aussi que toute la flotte vieillisse la même semaine."),
            ["Tester la tension au repos et en charge avant les premières gelées", "Charger avec un chargeur intelligent les véhicules immobilisés ou à trajets courts", "Remplacer les batteries à quatre ou cinq ans selon un calendrier, de façon échelonnée"],
        ),
    },
    {
        "author": 1,
        "image": "b2b-guide-motorcycle-and-powersports-batteries-sizing-c",
        "date": "2026-10-02",
        "en": (
            "Motorcycle Battery Storage: Avoiding a Dead Battery in Spring",
            "Every spring, workshops see the same thing: a bike that ran perfectly in October and will not turn over in March. The battery rarely failed over the winter. It was left to self-discharge until it was damaged.",
            ("Why stored batteries die", "Every battery loses charge slowly even when nothing is connected, and the bike's alarm, clock and ignition electronics add a small constant drain. A lead-acid battery left partly discharged forms hard crystals on its plates (sulphation), and once that sets in the lost capacity does not come back. Small motorcycle batteries have little reserve, so they reach that point sooner than a car battery."),
            ("A storage routine that works", "Charge the battery fully before storage and keep it somewhere cool and dry, indoors if possible. The best option is a smart charger or battery maintainer that tops it up automatically and switches to a float mode; failing that, disconnect the battery and recharge it every four to six weeks. Use a charger suited to the chemistry: AGM and gel batteries want a charger with the right profile, and lithium batteries need a lithium-compatible charger. In spring, check the voltage and clean the terminals before the first start."),
            ["Charge fully before storing and keep the battery cool and dry", "Use a smart maintainer, or disconnect and recharge every four to six weeks", "Match the charger to the battery chemistry: AGM, gel or lithium"],
        ),
        "fr": (
            "Stockage d'une batterie moto : éviter la panne du printemps",
            "Chaque printemps, les ateliers voient la même chose : une moto qui roulait parfaitement en octobre et qui ne démarre plus en mars. La batterie a rarement lâché pendant l'hiver. Elle s'est déchargée toute seule jusqu'à être endommagée.",
            ("Pourquoi les batteries stockées meurent", "Toute batterie perd lentement sa charge, même débranchée, et l'alarme, l'horloge et l'électronique d'allumage de la moto ajoutent une petite consommation permanente. Une batterie au plomb laissée partiellement déchargée forme des cristaux durs sur ses plaques (sulfatation), et une fois installée, la capacité perdue ne revient pas. Les petites batteries de moto ont peu de réserve et atteignent ce stade plus vite qu'une batterie de voiture."),
            ("Une routine de stockage qui fonctionne", "Chargez complètement la batterie avant le stockage et gardez-la au frais et au sec, à l'intérieur si possible. La meilleure solution est un chargeur intelligent ou mainteneur de charge, qui la complète automatiquement puis passe en maintien ; à défaut, débranchez la batterie et rechargez-la toutes les quatre à six semaines. Utilisez un chargeur adapté à la technologie : les batteries AGM et gel demandent le bon profil de charge, et les batteries au lithium un chargeur compatible lithium. Au printemps, vérifiez la tension et nettoyez les bornes avant le premier démarrage."),
            ["Charger complètement avant le stockage, au frais et au sec", "Utiliser un mainteneur intelligent, ou débrancher et recharger toutes les quatre à six semaines", "Adapter le chargeur à la technologie : AGM, gel ou lithium"],
        ),
    },
    {
        "author": 0,
        "image": "b2b-guide-deep-cycle-batteries-for-boats-and-motorhomes",
        "date": "2026-10-05",
        "en": (
            "Starter or Deep-Cycle? Choosing a Battery for a Boat or Motorhome",
            "A boat or motorhome has two jobs for its batteries: start the engine, and run the lights, fridge and electronics when the engine is off. One battery type rarely does both well, and fitting a starter battery to the second job is a classic way to ruin it in a single season.",
            ("Two designs for two jobs", "A starter battery delivers a very large current for a few seconds and is then recharged by the engine. It uses many thin plates for high current, and it does not tolerate being drained. A deep-cycle battery uses thicker plates and is built to supply a modest current for hours and be recharged again and again. Run a starter battery down repeatedly and it loses capacity quickly; a deep-cycle battery asked to crank a big engine may not give enough current. Dual-purpose batteries sit in between and suit small boats with light loads."),
            ("Sealed chemistries and charging", "On a boat or in a motorhome the battery tilts, vibrates and sits in a confined space, so sealed AGM and gel batteries are popular: no spills, no topping up and good tolerance of repeated discharge. As a rule, avoid discharging a lead-acid battery below about half of its capacity. Charging matters as much as the battery: gel, AGM and flooded batteries want different charging voltages, so set the charger or charge controller to the battery type, and consider lithium iron phosphate where weight and usable capacity justify the cost."),
            ["Use a starter battery to start and a deep-cycle battery for the house loads", "Avoid discharging lead-acid below about half capacity", "Set the charger profile to the chemistry: flooded, AGM, gel or lithium"],
        ),
        "fr": (
            "Batterie de démarrage ou à décharge lente : que choisir pour un bateau ou un camping-car ?",
            "Un bateau ou un camping-car demande deux choses à ses batteries : démarrer le moteur, et alimenter l'éclairage, le réfrigérateur et l'électronique moteur coupé. Un seul type de batterie fait rarement les deux correctement, et monter une batterie de démarrage pour le second usage est une façon classique de la détruire en une saison.",
            ("Deux conceptions pour deux usages", "Une batterie de démarrage délivre un très fort courant pendant quelques secondes, puis le moteur la recharge. Elle utilise de nombreuses plaques fines pour fournir ce courant et supporte mal d'être vidée. Une batterie à décharge lente utilise des plaques plus épaisses et sert un courant modéré pendant des heures, puis se recharge cycle après cycle. Vider régulièrement une batterie de démarrage lui fait perdre vite de la capacité ; une batterie à décharge lente sollicitée pour lancer un gros moteur peut ne pas fournir assez de courant. Les batteries mixtes se situent entre les deux et conviennent aux petits bateaux à faibles besoins."),
            ("Technologies étanches et charge", "Sur un bateau ou un camping-car, la batterie penche, vibre et se trouve dans un espace confiné : les batteries AGM et gel étanches sont donc très utilisées, sans fuite, sans appoint d'eau et avec une bonne tolérance aux décharges répétées. En règle générale, évitez de décharger une batterie au plomb sous la moitié environ de sa capacité. La charge compte autant que la batterie : le gel, l'AGM et l'électrolyte liquide demandent des tensions de charge différentes, réglez donc le chargeur ou le régulateur selon le type de batterie, et envisagez le lithium fer phosphate lorsque le poids et la capacité utile justifient le coût."),
            ["Une batterie de démarrage pour démarrer, une batterie à décharge lente pour les besoins de bord", "Éviter de décharger une batterie au plomb sous environ la moitié de sa capacité", "Régler le profil de charge selon la technologie : liquide, AGM, gel ou lithium"],
        ),
    },
    {
        "author": 1,
        "image": "b2b-guide-battery-chargers-and-jump-starters-choosing-t",
        "date": "2026-10-07",
        "en": (
            "Jump Starter or Smart Charger? What a Trade Counter Should Recommend",
            "A customer with a flat battery asks for one of two very different products. A jump starter gets a vehicle going now; a smart charger restores and maintains the battery. Selling the wrong one means a second visit or a second flat battery.",
            ("Different tools for different problems", "A jump starter is a portable power pack that delivers enough current to start an engine without a second vehicle. It is the right answer for a breakdown at the roadside, on a job site or in a workshop yard. It does not charge the battery properly: the alternator has to do that, and a battery that keeps going flat has a cause. A smart charger recharges the battery in stages and then maintains it, which is what a vehicle that stands for days or a stored motorcycle needs."),
            ("Questions to ask at the counter", "Ask what the battery is, because chargers and jump starters have to suit the voltage and chemistry: 6 V, 12 V or 24 V, and lead-acid, AGM, gel or lithium. Ask how big the engine is, since petrol and diesel engines of different sizes need different peak current from a jump starter. Ask how often the vehicle is used. A fleet with idle vehicles is best served by a maintainer on each one; a van that lives on the road is better with a jump starter in the cab. For most trade customers the honest answer is one of each."),
            ["Jump starter to get going now, smart charger to restore and maintain", "Match voltage and battery chemistry, and size the jump starter to the engine", "Idle vehicles need a maintainer; vehicles on the road need a jump starter in the cab"],
        ),
        "fr": (
            "Booster de démarrage ou chargeur intelligent : que conseiller au comptoir ?",
            "Un client avec une batterie à plat demande l'un de deux produits très différents. Un booster de démarrage remet un véhicule en marche tout de suite ; un chargeur intelligent restaure et entretient la batterie. Vendre le mauvais, c'est une deuxième visite ou une deuxième batterie à plat.",
            ("Des outils différents pour des problèmes différents", "Un booster de démarrage est une batterie portable qui fournit assez de courant pour lancer un moteur sans second véhicule. C'est la bonne réponse pour une panne en bord de route, sur un chantier ou dans la cour d'un atelier. Il ne recharge pas correctement la batterie : c'est le rôle de l'alternateur, et une batterie qui se décharge sans cesse a une cause. Un chargeur intelligent recharge la batterie par étapes puis la maintient, ce dont a besoin un véhicule qui reste immobile plusieurs jours ou une moto remisée."),
            ("Les questions à poser au comptoir", "Demandez de quelle batterie il s'agit, car chargeurs et boosters doivent correspondre à la tension et à la technologie : 6 V, 12 V ou 24 V, et plomb, AGM, gel ou lithium. Demandez la taille du moteur, car les moteurs essence et diesel de cylindrées différentes demandent des courants de pointe différents au booster. Demandez à quelle fréquence le véhicule roule. Une flotte avec des véhicules immobilisés est mieux servie par un mainteneur sur chacun ; un utilitaire toujours sur la route sera mieux équipé d'un booster dans la cabine. Pour la plupart des clients professionnels, la réponse honnête est un de chaque."),
            ["Un booster pour repartir tout de suite, un chargeur intelligent pour restaurer et entretenir", "Respecter la tension et la technologie, et dimensionner le booster au moteur", "Véhicules immobilisés : un mainteneur ; véhicules sur la route : un booster en cabine"],
        ),
    },
]
