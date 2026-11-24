import { currentPart, inspectPart } from './pages.js';

const parts = {
  chassis: {
    ro: ['Șasiu', 'Cadru din patru profile perforate', 'Cadrul poartă roțile, bateria și liftul. Placa centrală leagă laturile și lasă spațiu pentru cabluri.', 'Asamblarea bazei', 'Cele patru profile formează un dreptunghi. Suporturile din colțuri fixează placa între ele.'],
    en: ['Chassis', 'Frame with four perforated rails', 'The frame carries the wheels, battery and lift. The centre plate ties the rails together and leaves room for wiring.', 'Building the base', 'Four rails form a rectangle. Brackets in the corners hold the plate between them.'],
  },
  wheels: {
    ro: ['Roți mecanum', '4 roți cu câte 10 role oblice', 'Rolele sunt înclinate în sensuri diferite. Combinând sensul de rotație al celor patru roți, robotul se poate deplasa și lateral.', 'Montarea roților', 'Fiecare modul se prinde lângă un colț al șasiului. Modulele din stânga și dreapta au role orientate în oglindă.'],
    en: ['Mecanum wheels', '4 wheels with 10 angled rollers each', 'The rollers sit at opposing angles. Changing the direction of the four wheels lets the robot travel sideways as well as forwards.', 'Fitting the wheels', 'Each module sits near a corner of the frame. The rollers on the left and right wheels mirror one another.'],
  },
  electronics: {
    ro: ['Electronică', 'Acumulator de 12 V și controler', 'Acumulatorul roșu stochează energia. Lângă el, controlerul cu aripioare de răcire transmite comenzile către motoare.', 'Cablarea', 'Acumulatorul și controlerul se așază între lonjeroane, unde cablurile pot ajunge la motoare fără să traverseze liftul.'],
    en: ['Electronics', '12 V battery and controller', 'The red battery stores energy. The finned controller beside it sends commands to the motors.', 'Routing the wires', 'The battery and controller sit between the side rails so the motor cables can run clear of the lift.'],
  },
  lift: {
    ro: ['Lift', '2 ghidaje verticale și un troliu', 'Căruciorul se deplasează pe ghidaje și ridică brațul cu clește. Rolele de sus schimbă direcția cablului.', 'Montarea liftului', 'Ghidajele se prind de șasiu. Căruciorul le unește, iar troliul și rolele formează traseul cablului.'],
    en: ['Lift', '2 vertical guides and a winch', 'The carriage slides along the guides to raise the arm and gripper. The pulleys at the top change the direction of the cable.', 'Mounting the lift', 'The guides attach to the chassis. The carriage spans the two rails, while the winch and pulleys define the cable path.'],
  },
  gripper: {
    ro: ['Clește', '2 degete articulate', 'Degetele se închid în jurul unei piese. Zonele cauciucate de la vârf ajută la menținerea prizei când liftul se mișcă.', 'Asamblarea cleștelui', 'Cele două degete se montează pe pivoți la capătul brațului, cu suprafețele de contact orientate una către alta.'],
    en: ['Gripper', '2 articulated fingers', 'The fingers close around a game piece. Rubber pads at the tips help maintain the grip as the lift moves.', 'Assembling the gripper', 'Both fingers pivot at the end of the arm, with their contact pads facing each other.'],
  },
  intake: {
    ro: ['Colector', '9 discuri pe un ax comun', 'Discurile se rotesc împreună pentru a antrena o piesă de joc către robot. Curelele laterale transmit mișcarea la ax.', 'Montarea colectorului', 'Discurile se aliniază pe axul frontal, între suporturile laterale. Cele două curele trec pe lângă capetele axului.'],
    en: ['Intake', '9 discs on a shared shaft', 'The discs turn together to draw a game piece towards the robot. Side belts transmit motion to the shaft.', 'Fitting the intake', 'The discs line up on the front shaft between the side brackets. The belts run alongside the ends of the shaft.'],
  },
};

const studio = document.querySelector('.component-studio');
const heading = studio.querySelector('h1');
const sheet = studio.querySelector('.component-sheet');
const partsNav = studio.querySelector('.part-selector');
const replay = studio.querySelector('.part-replay');
const selectors = new Map();
let current = currentPart();
let copyAnimation;

for (const key of Object.keys(parts)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.addEventListener('click', () => inspectPart(key));
  selectors.set(key, button);
  partsNav.append(button);
}

function updateLabels() {
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ro';
  const [name, spec, description, stage, build] = parts[current][lang];
  heading.textContent = name;
  studio.querySelector('.part-spec').textContent = spec;
  studio.querySelector('.part-description').textContent = description;
  studio.querySelector('.part-stage').textContent = stage;
  studio.querySelector('.part-build').textContent = build;
  const still = document.documentElement.dataset.motion === 'paused';
  replay.querySelector('span').textContent = lang === 'en'
    ? (still ? 'Switch pose' : 'Replay motion')
    : (still ? 'Schimbă poziția' : 'Repetă animația');
  selectors.forEach((button, key) => {
    button.textContent = parts[key][lang][0];
    button.setAttribute('aria-pressed', String(key === current));
  });
}

document.addEventListener('site:page', event => {
  if (event.detail.page !== 'robot') return;
  current = event.detail.part;
  studio.querySelector('details').open = false;
  updateLabels();
  copyAnimation?.cancel();
  if (document.documentElement.dataset.motion !== 'paused' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    copyAnimation = sheet.animate(
      [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: 450, easing: 'cubic-bezier(.2,.75,.23,1)' }
    );
  }
});
document.addEventListener('robot:inspect', event => inspectPart(event.detail));
replay.addEventListener('click', () => document.dispatchEvent(new Event('robot:replay')));
document.addEventListener('site:language', updateLabels);
document.addEventListener('site:motion', updateLabels);
updateLabels();
