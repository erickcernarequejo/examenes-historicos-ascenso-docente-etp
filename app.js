(() => {
  'use strict';

  const examConfig = window.EXAM_CONFIG || { form: 1, questionsGlobal: 'EXAM_QUESTIONS', storageKey: 'ascenso-docente-ept-2019-v1' };
  const questions = window[examConfig.questionsGlobal];
  const STORAGE_KEY = examConfig.storageKey;
  const letters = ['a', 'b', 'c'];
  const visualAssets = examConfig.form === 2 ? {
    12: ['assets/punto-equilibrio.png', 'Gráfico del punto de equilibrio'],
    13: ['assets/punto-equilibrio.png', 'Gráfico del punto de equilibrio'],
    14: ['assets/punto-equilibrio.png', 'Gráfico del punto de equilibrio'],
    17: ['assets/marca-dulci-hierro.png', 'Marca Dulci-Hierro compuesta por texto e imagen de dos galletas'],
    18: ['assets/senales-seguridad.png', 'Tres señales de seguridad: obligación, advertencia y prohibición'],
    22: ['assets/diagrama-dop.png', 'Diagrama de Operaciones del Proceso presentado en la pregunta']
  } : {
    42: ['assets/punto-equilibrio.png', 'Gráfico del punto de equilibrio'],
    43: ['assets/punto-equilibrio.png', 'Gráfico del punto de equilibrio'],
    44: ['assets/punto-equilibrio.png', 'Gráfico del punto de equilibrio'],
    47: ['assets/marca-dulci-hierro.png', 'Marca Dulci-Hierro compuesta por texto e imagen de dos galletas'],
    48: ['assets/senales-seguridad.png', 'Tres señales de seguridad: obligación, advertencia y prohibición'],
    52: ['assets/diagrama-dop.png', 'Diagrama de Operaciones del Proceso presentado en la pregunta']
  };
  const dapQuestion = examConfig.form === 2 ? 19 : 49;
  const salesQuestion = examConfig.form === 2 ? 30 : 60;

  const defaults = { current: 0, answers: {}, checked: {}, started: false, finished: false, reviewing: false };
  let state = loadState();

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    welcome: $('#welcomeView'), quiz: $('#quizView'), results: $('#resultsView'),
    start: $('#startButton'), startText: $('#startButtonText'), resumeNote: $('#resumeNote'),
    reset: $('#resetButton'), questionGrid: $('#questionGrid'), progressLabel: $('#progressLabel'),
    progressPercent: $('#progressPercent'), progressBar: $('#progressBar'), mobileProgress: $('#mobileProgress'),
    mobileNav: $('#mobileNavButton'), nav: $('.question-nav'), questionNumber: $('#questionNumber'),
    prompt: $('#questionPrompt'), visual: $('#questionVisual'), options: $('#optionsList'), feedback: $('#feedbackBox'),
    previous: $('#previousButton'), check: $('#checkButton'), next: $('#nextButton'),
    finishTop: $('#finishTopButton'), finishDialog: $('#finishDialog'), finishText: $('#finishDialogText'),
    closeDialog: $('#closeDialogButton'), cancelFinish: $('#cancelFinishButton'), confirmFinish: $('#confirmFinishButton'),
    resultRing: $('#resultRing'), resultPercent: $('#resultPercent'), resultTitle: $('#resultTitle'),
    resultMessage: $('#resultMessage'), correctCount: $('#correctCount'), wrongCount: $('#wrongCount'),
    scoreCount: $('#scoreCount'), review: $('#reviewButton'), tryAgain: $('#tryAgainButton')
  };

  initialize();

  function initialize() {
    buildQuestionGrid();
    const hasProgress = Object.keys(state.answers).length > 0;
    if (hasProgress && !state.finished) {
      elements.startText.textContent = 'Continuar práctica';
      elements.resumeNote.hidden = false;
    }
    if (state.finished) showResults();

    elements.start.addEventListener('click', startQuiz);
    elements.reset.addEventListener('click', resetWithConfirmation);
    elements.previous.addEventListener('click', () => goTo(state.current - 1));
    elements.next.addEventListener('click', () => state.current === questions.length - 1 ? openFinishDialog() : goTo(state.current + 1));
    elements.check.addEventListener('click', checkCurrentAnswer);
    elements.mobileNav.addEventListener('click', toggleMobileNav);
    elements.closeDialog.addEventListener('click', () => elements.finishDialog.close());
    elements.cancelFinish.addEventListener('click', () => elements.finishDialog.close());
    elements.confirmFinish.addEventListener('click', finishQuiz);
    elements.review.addEventListener('click', reviewAnswers);
    elements.tryAgain.addEventListener('click', resetQuiz);
    elements.finishDialog.addEventListener('click', (event) => {
      if (event.target === elements.finishDialog) elements.finishDialog.close();
    });
    document.addEventListener('keydown', handleKeyboard);
  }

  function loadState() {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
      return { ...defaults };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setView(view) {
    elements.welcome.hidden = view !== 'welcome';
    elements.quiz.hidden = view !== 'quiz';
    elements.results.hidden = view !== 'results';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startQuiz() {
    state.started = true;
    state.finished = false;
    state.reviewing = false;
    saveState();
    setView('quiz');
    renderQuestion();
  }

  function buildQuestionGrid() {
    const fragment = document.createDocumentFragment();
    questions.forEach((question, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = question.id;
      button.setAttribute('aria-label', `Ir a la pregunta ${question.id}`);
      button.addEventListener('click', () => {
        goTo(index);
        elements.nav.classList.remove('open');
        elements.mobileNav.setAttribute('aria-expanded', 'false');
      });
      fragment.append(button);
    });
    elements.questionGrid.append(fragment);
  }

  function renderQuestion() {
    const question = questions[state.current];
    const selected = state.answers[question.id];
    const evaluated = Boolean(state.checked[question.id] || state.reviewing);

    elements.questionNumber.textContent = question.id;
    elements.mobileProgress.textContent = `${question.id} / ${questions.length}`;
    elements.prompt.textContent = formatPrompt(question);
    renderVisual(question);
    renderOptions(question, selected, evaluated);
    renderFeedback(question, selected, evaluated);
    updateNavigation();

    elements.previous.disabled = state.current === 0;
    elements.check.hidden = evaluated;
    elements.check.disabled = !selected;
    elements.next.hidden = !evaluated;
    elements.next.innerHTML = state.current === questions.length - 1 ? 'Ver resultados <span aria-hidden="true">→</span>' : 'Siguiente <span aria-hidden="true">→</span>';
    elements.finishTop.textContent = state.reviewing ? 'Volver a resultados' : 'Finalizar práctica';
    elements.finishTop.onclick = state.reviewing ? showResults : openFinishDialog;
    elements.prompt.focus({ preventScroll: true });
  }

  function formatPrompt(question) {
    if (question.id !== salesQuestion) return question.prompt;
    return 'Un equipo de estudiantes busca conocer la evolución de la venta que ha tenido su producto en los últimos seis meses. A continuación, se muestran los registros de las ventas mensuales.\n\n¿Qué gráfico estadístico es pertinente utilizar para mostrar la evolución de la cantidad de productos vendidos en los meses indicados?';
  }

  function renderVisual(question) {
    elements.visual.innerHTML = '';
    elements.visual.className = '';
    if (visualAssets[question.id]) {
      const [source, alt] = visualAssets[question.id];
      const figure = document.createElement('figure');
      figure.className = 'question-visual';
      const image = document.createElement('img');
      image.src = source;
      image.alt = alt;
      figure.append(image);
      elements.visual.append(figure);
    }
    if (question.id === salesQuestion) {
      const wrapper = document.createElement('div');
      wrapper.className = 'question-visual';
      wrapper.innerHTML = `<table class="sales-table"><caption>Registro de ventas mensuales</caption><thead><tr><th>Mes</th><th>Unidades vendidas</th></tr></thead><tbody>${[
        ['Junio', 300], ['Julio', 280], ['Agosto', 250], ['Setiembre', 280], ['Octubre', 300], ['Noviembre', 310]
      ].map(([month, units]) => `<tr><td>${month}</td><td>${units}</td></tr>`).join('')}</tbody></table>`;
      elements.visual.append(wrapper);
    }
  }

  function renderOptions(question, selected, evaluated) {
    elements.options.innerHTML = '';
    question.options.forEach((text, index) => {
      const letter = letters[index];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', selected === letter ? 'true' : 'false');
      button.dataset.letter = letter;
      const letterBox = document.createElement('span');
      letterBox.className = 'option-letter';
      letterBox.textContent = letter;
      const optionText = document.createElement('span');
      optionText.className = 'option-text';
      optionText.textContent = text;
      if (question.id === dapQuestion) {
        const symbol = document.createElement('img');
        symbol.className = 'dap-symbol-image';
        symbol.src = `assets/dap-simbolo-${letter}.png`;
        symbol.alt = index === 0 ? 'símbolo con forma de letra D' : index === 1 ? 'símbolo circular' : 'símbolo cuadrado';
        optionText.append(symbol);
      }
      button.append(letterBox, optionText);

      if (selected === letter) button.classList.add('selected');
      if (evaluated) {
        button.classList.add('locked');
        if (letter === question.answer) button.classList.add('correct');
        if (selected === letter && letter !== question.answer) button.classList.add('incorrect');
      } else {
        button.addEventListener('click', () => selectOption(question.id, letter));
      }
      elements.options.append(button);
    });
  }

  function renderFeedback(question, selected, evaluated) {
    if (!evaluated) {
      elements.feedback.hidden = true;
      return;
    }
    const isCorrect = selected === question.answer;
    const answerText = question.options[letters.indexOf(question.answer)];
    elements.feedback.className = `feedback-box ${isCorrect ? 'correct' : 'incorrect'}`;
    elements.feedback.innerHTML = isCorrect
      ? '<strong>¡Respuesta correcta!</strong> Has identificado la alternativa adecuada.'
      : `<strong>${selected ? 'Esta vez no fue la correcta.' : 'Pregunta sin responder.'}</strong> La respuesta correcta es ${question.answer.toUpperCase()}: ${escapeHtml(answerText)}`;
    elements.feedback.hidden = false;
  }

  function selectOption(questionId, letter) {
    state.answers[questionId] = letter;
    saveState();
    renderQuestion();
  }

  function checkCurrentAnswer() {
    const question = questions[state.current];
    if (!state.answers[question.id]) return;
    state.checked[question.id] = true;
    saveState();
    renderQuestion();
  }

  function goTo(index) {
    if (index < 0 || index >= questions.length) return;
    state.current = index;
    saveState();
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateNavigation() {
    const answered = Object.keys(state.answers).length;
    const percent = Math.round(answered / questions.length * 100);
    elements.progressLabel.textContent = `${answered} de ${questions.length}`;
    elements.progressPercent.textContent = `${percent}%`;
    elements.progressBar.style.width = `${percent}%`;
    [...elements.questionGrid.children].forEach((button, index) => {
      const question = questions[index];
      button.className = '';
      if (state.answers[question.id]) button.classList.add('answered');
      if (state.reviewing && state.answers[question.id]) button.classList.add(state.answers[question.id] === question.answer ? 'correct' : 'wrong');
      if (index === state.current) button.classList.add('current');
      button.setAttribute('aria-current', index === state.current ? 'step' : 'false');
    });
  }

  function toggleMobileNav() {
    const isOpen = elements.nav.classList.toggle('open');
    elements.mobileNav.setAttribute('aria-expanded', String(isOpen));
  }

  function openFinishDialog() {
    const unanswered = questions.length - Object.keys(state.answers).length;
    elements.finishText.textContent = unanswered
      ? `Aún tienes ${unanswered} ${unanswered === 1 ? 'pregunta sin responder' : 'preguntas sin responder'}. Podrás revisarlas después.`
      : 'Has respondido las 60 preguntas. Podrás revisar cada respuesta después.';
    elements.finishDialog.showModal();
  }

  function finishQuiz() {
    state.finished = true;
    state.reviewing = false;
    saveState();
    elements.finishDialog.close();
    showResults();
  }

  function calculateResults() {
    const correct = questions.filter((question) => state.answers[question.id] === question.answer).length;
    const unanswered = questions.filter((question) => !state.answers[question.id]).length;
    return { correct, unanswered, wrong: questions.length - correct - unanswered, percent: Math.round(correct / questions.length * 100), score: correct * 1.5 };
  }

  function showResults() {
    const result = calculateResults();
    setView('results');
    elements.resultRing.style.setProperty('--result', `${result.percent * 3.6}deg`);
    elements.resultPercent.textContent = `${result.percent}%`;
    elements.correctCount.textContent = result.correct;
    elements.wrongCount.textContent = result.wrong + result.unanswered;
    elements.scoreCount.textContent = Number.isInteger(result.score) ? result.score : result.score.toFixed(1);
    if (result.percent >= 80) {
      elements.resultTitle.textContent = '¡Excelente trabajo!';
      elements.resultMessage.textContent = 'Tienes un dominio sólido de los contenidos. Revisa los pocos errores para afianzar aún más tu preparación.';
    } else if (result.percent >= 60) {
      elements.resultTitle.textContent = '¡Vas por buen camino!';
      elements.resultMessage.textContent = 'Tu resultado muestra una buena base. Revisa las respuestas incorrectas y vuelve a intentarlo para seguir avanzando.';
    } else {
      elements.resultTitle.textContent = 'Cada intento cuenta';
      elements.resultMessage.textContent = 'Usa la revisión para reconocer los temas que necesitan refuerzo. La práctica constante hará la diferencia.';
    }
  }

  function reviewAnswers() {
    state.reviewing = true;
    state.current = 0;
    saveState();
    setView('quiz');
    renderQuestion();
  }

  function resetWithConfirmation() {
    if (!Object.keys(state.answers).length || window.confirm('¿Deseas borrar todo tu avance y comenzar de nuevo?')) resetQuiz();
  }

  function resetQuiz() {
    state = { ...defaults, answers: {}, checked: {} };
    localStorage.removeItem(STORAGE_KEY);
    elements.startText.textContent = 'Comenzar práctica';
    elements.resumeNote.hidden = true;
    setView('welcome');
    updateNavigation();
  }

  function handleKeyboard(event) {
    if (elements.quiz.hidden || elements.finishDialog.open) return;
    const question = questions[state.current];
    const evaluated = state.checked[question.id] || state.reviewing;
    if (!evaluated && ['a', 'b', 'c'].includes(event.key.toLowerCase())) selectOption(question.id, event.key.toLowerCase());
    if (event.key === 'ArrowLeft') goTo(state.current - 1);
    if (event.key === 'ArrowRight' && (evaluated || state.answers[question.id])) goTo(state.current + 1);
  }

  function escapeHtml(value) {
    const node = document.createElement('div');
    node.textContent = value;
    return node.innerHTML;
  }
})();
