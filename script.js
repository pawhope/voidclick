// ======================================
// FIREBASE IMPORTS
// ======================================

import {
  initializeApp
} from
"https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";


import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  runTransaction
} from
"https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";



// ======================================
// FIREBASE CONFIG
// ======================================

const firebaseConfig = {

  apiKey:
    "AIzaSyCLPXDVC13jNN0g2Y4IkNHreCuysBxEIwQ",

  authDomain:
    "voidclick.firebaseapp.com",

  projectId:
    "voidclick",

  storageBucket:
    "voidclick.firebasestorage.app",

  messagingSenderId:
    "1069992197959",

  appId:
    "1:1069992197959:web:8dd475ecc4d9ea3e905662"

};



const firebaseApp =
  initializeApp(
    firebaseConfig
  );


const auth =
  getAuth(
    firebaseApp
  );


const db =
  getFirestore(
    firebaseApp
  );



// ======================================
// HTML ELEMANLARI
// ======================================

const gameArea =
  document.getElementById(
    "game-area"
  );


const fallingRing =
  document.getElementById(
    "falling-ring"
  );


const targetRing =
  document.getElementById(
    "target-ring"
  );


const hitButton =
  document.getElementById(
    "hit-button"
  );


const scoreElement =
  document.getElementById(
    "score"
  );


const comboElement =
  document.getElementById(
    "combo"
  );


const bestScoreElement =
  document.getElementById(
    "best-score"
  );


const feedbackElement =
  document.getElementById(
    "feedback"
  );


const startScreen =
  document.getElementById(
    "start-screen"
  );


const startButton =
  document.getElementById(
    "start-button"
  );


const countdownElement =
  document.getElementById(
    "countdown"
  );


const gameOverScreen =
  document.getElementById(
    "game-over-screen"
  );


const finalScoreElement =
  document.getElementById(
    "final-score"
  );


const finalBestElement =
  document.getElementById(
    "final-best"
  );


const playAgainButton =
  document.getElementById(
    "play-again-button"
  );


const usernameScreen =
  document.getElementById(
    "username-screen"
  );


const usernameInput =
  document.getElementById(
    "username-input"
  );


const usernameButton =
  document.getElementById(
    "username-button"
  );


const usernameError =
  document.getElementById(
    "username-error"
  );


const leaderboardList =
  document.getElementById(
    "leaderboard-list"
  );



// ======================================
// OYUN AYARLARI
// ======================================

const START_SPEED =
  170;


const SPEED_INCREASE =
  15;


const PERFECT_DISTANCE =
  8;


const GREAT_DISTANCE =
  20;


const GOOD_DISTANCE =
  38;



// ======================================
// OYUN DEĞİŞKENLERİ
// ======================================

let score =
  0;


let combo =
  0;


let hitCount =
  0;


let speed =
  START_SPEED;


let ringY =
  -100;


let gameRunning =
  false;


let lastFrameTime =
  0;


let animationFrameId =
  null;



// ======================================
// PLAYER
// ======================================

let currentUser =
  null;


let currentUsername =
  null;



// ======================================
// BEST SCORE
// ======================================

let bestScore =

  Number(

    localStorage.getItem(
      "voidclick-best-score"
    )

  ) || 0;



bestScoreElement.textContent =
  bestScore;



// ======================================
// YARDIMCI FONKSİYONLAR
// ======================================

function show(element) {

  element.classList.remove(
    "hidden"
  );

}


function hide(element) {

  element.classList.add(
    "hidden"
  );

}


function wait(milliseconds) {

  return new Promise(
    resolve => {

      setTimeout(
        resolve,
        milliseconds
      );

    }
  );

}



// ======================================
// USERNAME NORMALIZE
// ======================================

function normalizeUsername(
  username
) {

  return username
    .normalize("NFKC")
    .toLowerCase();

}



// ======================================
// USERNAME GEÇERLİ Mİ?
// ======================================

function isValidUsername(
  username
) {

  /*
    Harf
    Rakam
    Nokta
    Alt çizgi
    Tire

    kullanılabilir.
  */

  const usernamePattern =
    /^[\p{L}\p{N}._-]+$/u;


  return usernamePattern.test(
    username
  );

}



// ======================================
// FIREBASE AUTH BEKLE
// ======================================

function getInitialAuthUser() {

  return new Promise(
    resolve => {

      const unsubscribe =
        onAuthStateChanged(
          auth,
          user => {

            unsubscribe();

            resolve(
              user
            );

          }
        );

    }
  );

}



// ======================================
// ESKİ KULLANICININ ADINI REZERVE ET
// ======================================

async function claimExistingUsername() {

  if (
    !currentUser ||
    !currentUsername
  ) {

    return;

  }


  const usernameKey =
    normalizeUsername(
      currentUsername
    );


  const usernameReference =
    doc(
      db,
      "usernames",
      usernameKey
    );


  try {

    await runTransaction(
      db,
      async transaction => {

        const usernameSnapshot =
          await transaction.get(
            usernameReference
          );


        if (
          !usernameSnapshot.exists()
        ) {

          transaction.set(
            usernameReference,
            {

              uid:
                currentUser.uid,

              username:
                currentUsername

            }
          );


          return;

        }


        const usernameData =
          usernameSnapshot.data();


        if (
          usernameData.uid !==
          currentUser.uid
        ) {

          console.warn(
            "USERNAME ALREADY CLAIMED BY ANOTHER USER:",
            currentUsername
          );

        }

      }
    );

  }


  catch (error) {

    console.error(
      "OLD USERNAME CLAIM ERROR:",
      error
    );

  }

}



// ======================================
// PLAYER BAŞLAT
// ======================================

async function initializePlayer() {

  startButton.disabled =
    true;


  usernameButton.disabled =
    false;


  usernameError.textContent =
    "";


  try {

    let user =
      await getInitialAuthUser();


    if (
      !user
    ) {

      const credential =
        await signInAnonymously(
          auth
        );


      user =
        credential.user;

    }


    currentUser =
      user;


    const playerReference =
      doc(
        db,
        "players",
        currentUser.uid
      );


    const playerSnapshot =
      await getDoc(
        playerReference
      );


    // ==================================
    // ESKİ KULLANICI
    // ==================================

    if (
      playerSnapshot.exists()
    ) {

      const playerData =
        playerSnapshot.data();


      currentUsername =
        playerData.username;


      bestScore =
        Number(
          playerData.bestScore
        ) || 0;


      localStorage.setItem(
        "voidclick-username",
        currentUsername
      );


      localStorage.setItem(
        "voidclick-best-score",
        bestScore
      );


      bestScoreElement.textContent =
        bestScore;


      // Önceki sistemden gelen kullanıcıların
      // isimlerini usernames koleksiyonuna kaydet.
      await claimExistingUsername();


      hide(
        usernameScreen
      );


      startButton.disabled =
        false;


      await loadLeaderboard();


      console.log(
        "VOIDCLICK PLAYER:",
        currentUsername
      );


      return;

    }



    // ==================================
    // YENİ KULLANICI
    // ==================================

    show(
      usernameScreen
    );


    usernameInput.value =
      "";


    setTimeout(
      () => {

        usernameInput.focus();

      },
      100
    );


    await loadLeaderboard();

  }


  catch (error) {

    console.error(
      "PLAYER INITIALIZATION ERROR:",
      error
    );


    show(
      usernameScreen
    );


    usernameError.textContent =
      "Connection error. Please refresh.";

  }

}



// ======================================
// USERNAME KAYDET
// ======================================

async function saveUsername() {

  const username =

    usernameInput
      .value
      .trim();


  usernameError.textContent =
    "";


  // ==================================
  // UZUNLUK KONTROLÜ
  // ==================================

  if (
    username.length < 3
  ) {

    usernameError.textContent =
      "Username must be at least 3 characters.";

    return;

  }


  if (
    username.length > 16
  ) {

    usernameError.textContent =
      "Username can be maximum 16 characters.";

    return;

  }



  // ==================================
  // KARAKTER KONTROLÜ
  // ==================================

  if (
    !isValidUsername(
      username
    )
  ) {

    usernameError.textContent =
      "Only letters, numbers, . _ - are allowed.";

    return;

  }



  if (
    !currentUser
  ) {

    usernameError.textContent =
      "Player connection is not ready.";

    return;

  }



  usernameButton.disabled =
    true;



  try {

    const usernameKey =
      normalizeUsername(
        username
      );


    const usernameReference =
      doc(
        db,
        "usernames",
        usernameKey
      );


    const playerReference =
      doc(
        db,
        "players",
        currentUser.uid
      );



    // ==================================
    // ATOMIC USERNAME RESERVATION
    // ==================================

    await runTransaction(
      db,
      async transaction => {

        // Bütün okumalar önce yapılır
        const usernameSnapshot =
          await transaction.get(
            usernameReference
          );


        // İsim daha önce alınmış
        if (
          usernameSnapshot.exists()
        ) {

          const usernameData =
            usernameSnapshot.data();


          if (
            usernameData.uid !==
            currentUser.uid
          ) {

            throw new Error(
              "USERNAME_TAKEN"
            );

          }

        }



        // İsim boşsa kullanıcı adına kilitle
        if (
          !usernameSnapshot.exists()
        ) {

          transaction.set(
            usernameReference,
            {

              uid:
                currentUser.uid,

              username:
                username

            }
          );

        }



        // Player kaydı oluştur
        transaction.set(
          playerReference,
          {

            username:
              username,

            bestScore:
              0

          }
        );

      }
    );



    currentUsername =
      username;


    bestScore =
      0;


    localStorage.setItem(
      "voidclick-username",
      currentUsername
    );


    localStorage.setItem(
      "voidclick-best-score",
      "0"
    );


    bestScoreElement.textContent =
      "0";


    hide(
      usernameScreen
    );


    startButton.disabled =
      false;


    await loadLeaderboard();


    console.log(
      "NEW VOIDCLICK PLAYER:",
      username
    );

  }


  catch (error) {

    console.error(
      "USERNAME SAVE ERROR:",
      error
    );


    if (
      error.message ===
      "USERNAME_TAKEN"
    ) {

      usernameError.textContent =
        "This username is already taken.";

    }

    else {

      usernameError.textContent =
        "Username could not be saved.";

    }


    usernameButton.disabled =
      false;

  }

}



// ======================================
// TOP 5
// ======================================

async function loadLeaderboard() {

  try {

    const playersQuery =
      query(

        collection(
          db,
          "players"
        ),

        orderBy(
          "bestScore",
          "desc"
        ),

        limit(
          5
        )

      );


    const snapshot =
      await getDocs(
        playersQuery
      );


    leaderboardList.innerHTML =
      "";


    if (
      snapshot.empty
    ) {

      leaderboardList.innerHTML =
        "<li>No players yet</li>";

      return;

    }


    snapshot.forEach(
      playerDocument => {

        const player =
          playerDocument.data();


        const item =
          document.createElement(
            "li"
          );


        const row =
          document.createElement(
            "div"
          );


        row.className =
          "leaderboard-player";


        const name =
          document.createElement(
            "span"
          );


        name.className =
          "leaderboard-name";


        name.textContent =
          player.username;


        const playerScore =
          document.createElement(
            "span"
          );


        playerScore.className =
          "leaderboard-score";


        playerScore.textContent =
          Number(
            player.bestScore
          ).toLocaleString();


        row.appendChild(
          name
        );


        row.appendChild(
          playerScore
        );


        item.appendChild(
          row
        );


        leaderboardList.appendChild(
          item
        );

      }
    );

  }


  catch (error) {

    console.error(
      "LEADERBOARD ERROR:",
      error
    );


    leaderboardList.innerHTML =
      "<li>Unavailable</li>";

  }

}



// ======================================
// FIREBASE BEST SCORE
// ======================================

async function saveBestScoreToFirebase(
  newBestScore
) {

  if (
    !currentUser
  ) {

    return;

  }


  try {

    const playerReference =
      doc(
        db,
        "players",
        currentUser.uid
      );


    await updateDoc(

      playerReference,

      {

        bestScore:
          newBestScore

      }

    );


    await loadLeaderboard();

  }


  catch (error) {

    console.error(
      "BEST SCORE SAVE ERROR:",
      error
    );

  }

}



// ======================================
// BAŞLANGIÇ DURUMU
// ======================================

function resetGame() {

  score =
    0;


  combo =
    0;


  hitCount =
    0;


  speed =
    START_SPEED;


  gameRunning =
    false;


  scoreElement.textContent =
    "0";


  comboElement.textContent =
    "0";


  bestScoreElement.textContent =
    bestScore;


  feedbackElement.textContent =
    "";


  hitButton.disabled =
    true;


  fallingRing.classList.remove(
    "active"
  );


  hide(
    countdownElement
  );


  hide(
    gameOverScreen
  );


  show(
    startScreen
  );


  resetRing();

}



// ======================================
// GERİ SAYIM
// ======================================

async function startCountdown() {

  if (
    !currentUser ||
    !currentUsername
  ) {

    return;

  }


  hide(
    startScreen
  );


  hide(
    gameOverScreen
  );


  hitButton.disabled =
    true;


  show(
    countdownElement
  );


  countdownElement.textContent =
    "3";


  await wait(
    650
  );


  countdownElement.textContent =
    "2";


  await wait(
    650
  );


  countdownElement.textContent =
    "1";


  await wait(
    650
  );


  countdownElement.textContent =
    "GO!";


  await wait(
    350
  );


  hide(
    countdownElement
  );


  startGame();

}



// ======================================
// OYUN BAŞLAT
// ======================================

function startGame() {

  score =
    0;


  combo =
    0;


  hitCount =
    0;


  speed =
    START_SPEED;


  scoreElement.textContent =
    "0";


  comboElement.textContent =
    "0";


  gameRunning =
    true;


  hitButton.disabled =
    false;


  fallingRing.classList.add(
    "active"
  );


  resetRing();


  lastFrameTime =
    performance.now();


  animationFrameId =
    requestAnimationFrame(
      gameLoop
    );

}



// ======================================
// HALKAYI YUKARI GÖNDER
// ======================================

function resetRing() {

  const ringHeight =
    fallingRing.offsetHeight ||
    64;


  ringY =
    -ringHeight -
    20;


  updateRingPosition();

}



// ======================================
// HALKA KONUMU
// ======================================

function updateRingPosition() {

  fallingRing.style.transform =
    `translate(-50%, ${ringY}px)`;

}



// ======================================
// ANA OYUN DÖNGÜSÜ
// ======================================

function gameLoop(
  currentTime
) {

  if (
    !gameRunning
  ) {

    return;

  }


  const deltaTime =

    (
      currentTime -
      lastFrameTime
    )

    / 1000;


  lastFrameTime =
    currentTime;


  ringY +=

    speed *
    deltaTime;


  updateRingPosition();


  const ringCenter =

    ringY +

    fallingRing.offsetHeight /
    2;


  const targetCenter =

    targetRing.offsetTop +

    targetRing.offsetHeight /
    2;


  if (

    ringCenter >

    targetCenter +

    GOOD_DISTANCE +

    30

  ) {

    gameOver();

    return;

  }


  animationFrameId =

    requestAnimationFrame(
      gameLoop
    );

}



// ======================================
// HIT
// ======================================

function hitTarget(
  event
) {

  if (
    !gameRunning
  ) {

    return;

  }


  if (
    event
  ) {

    event.preventDefault();

  }


  const ringCenter =

    ringY +

    fallingRing.offsetHeight /
    2;


  const targetCenter =

    targetRing.offsetTop +

    targetRing.offsetHeight /
    2;


  const distance =

    Math.abs(

      ringCenter -
      targetCenter

    );


  // PERFECT

  if (

    distance <=
    PERFECT_DISTANCE

  ) {

    successfulHit(

      100,

      "PERFECT"

    );

    return;

  }


  // GREAT

  if (

    distance <=
    GREAT_DISTANCE

  ) {

    successfulHit(

      50,

      "GREAT"

    );

    return;

  }


  // GOOD

  if (

    distance <=
    GOOD_DISTANCE

  ) {

    successfulHit(

      25,

      "GOOD"

    );

    return;

  }


  // MISS

  gameOver();

}



// ======================================
// BAŞARILI VURUŞ
// ======================================

function successfulHit(
  points,
  quality
) {

  score +=
    points;


  combo++;


  hitCount++;


  scoreElement.textContent =
    score;


  comboElement.textContent =
    combo;


  showFeedback(
    quality
  );


  speed =

    START_SPEED +

    hitCount *
    SPEED_INCREASE +

    Math.pow(
      hitCount,
      1.25
    )

    * 4;


  resetRing();

}



// ======================================
// PERFECT / GREAT / GOOD
// ======================================

function showFeedback(
  text
) {

  feedbackElement.textContent =
    text;


  feedbackElement.classList.remove(
    "show"
  );


  void
  feedbackElement.offsetWidth;


  feedbackElement.classList.add(
    "show"
  );

}



// ======================================
// GAME OVER
// ======================================

function gameOver() {

  if (
    !gameRunning
  ) {

    return;

  }


  gameRunning =
    false;


  hitButton.disabled =
    true;


  fallingRing.classList.remove(
    "active"
  );


  if (
    animationFrameId
  ) {

    cancelAnimationFrame(
      animationFrameId
    );


    animationFrameId =
      null;

  }


  let newRecord =
    false;


  if (
    score >
    bestScore
  ) {

    bestScore =
      score;


    newRecord =
      true;


    localStorage.setItem(
      "voidclick-best-score",
      bestScore
    );

  }


  bestScoreElement.textContent =
    bestScore;


  finalScoreElement.textContent =
    score;


  finalBestElement.textContent =
    bestScore;


  show(
    gameOverScreen
  );


  if (
    newRecord
  ) {

    saveBestScoreToFirebase(
      bestScore
    );

  }

}



// ======================================
// EVENTLER
// ======================================

usernameButton.addEventListener(

  "click",

  saveUsername

);



usernameInput.addEventListener(

  "keydown",

  event => {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();

      saveUsername();

    }

  }

);



startButton.addEventListener(

  "click",

  startCountdown

);



playAgainButton.addEventListener(

  "click",

  startCountdown

);



hitButton.addEventListener(

  "pointerdown",

  hitTarget

);



// SPACE = HIT

document.addEventListener(

  "keydown",

  event => {

    if (

      event.code ===
      "Space"

      &&

      gameRunning

    ) {

      event.preventDefault();

      hitTarget(
        event
      );

    }

  }

);



// SAĞ TIK KAPALI

document.addEventListener(

  "contextmenu",

  event => {

    event.preventDefault();

  }

);



// ÇİFT DOKUNMA ZOOM KAPALI

document.addEventListener(

  "dblclick",

  event => {

    event.preventDefault();

  },

  {

    passive:
      false

  }

);



// ======================================
// SAYFA AÇILDIĞINDA
// ======================================

resetGame();


initializePlayer();
