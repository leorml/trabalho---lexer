// Analisador lexico da linguagem PascaLex (dialeto de Pascal)
// Le o codigo caractere por caractere e monta a lista de tokens.
// Recuperacao de erros: modo panico (guarda o erro, pula o trecho errado e continua)

const RESERVADAS = {
  'program': 'PROGRAM', 'begin': 'BEGIN', 'end': 'END', 'var': 'VAR', 'const': 'CONST',
  'procedure': 'PROCEDURE', 'function': 'FUNCTION',
  'integer': 'INTEGER', 'real': 'REAL', 'char': 'CHAR', 'string': 'STRING',
  'if': 'IF', 'then': 'THEN', 'else': 'ELSE', 'while': 'WHILE', 'do': 'DO',
  'repeat': 'REPEAT', 'until': 'UNTIL', 'break': 'BREAK', 'continue': 'CONTINUE',
  'for': 'FOR', 'to': 'TO',
  'or': 'OU', 'ou': 'OU', 'and': 'E', 'e': 'E'
};

// operadores e pontuacao (testa primeiro os de 2 caracteres)
const SIMBOLOS = {
  ':=': 'ATRIBUICAO', '<>': 'DIFERENTE', '<=': 'MENOR_IGUAL', '>=': 'MAIOR_IGUAL',
  '=': 'IGUAL', '<': 'MENOR', '>': 'MAIOR',
  '+': 'MAIS', '-': 'MENOS', '*': 'MULT', '/': 'DIVISAO',
  ';': 'PONTO_VIRGULA', ':': 'DOIS_PONTOS', ',': 'VIRGULA', '.': 'PONTO',
  '(': 'ABRE_PAR', ')': 'FECHA_PAR', '[': 'ABRE_COL', ']': 'FECHA_COL'
};

const TAM_MAX_ID = 15;

function ehLetra(c) { return /[a-zA-Z]/.test(c); }
function ehDigito(c) { return /[0-9]/.test(c); }
function ehLetraDigito(c) { return /[a-zA-Z0-9_]/.test(c); }

function analisar(codigo) {
  let tokens = [];
  let erros = [];
  let i = 0;
  let linha = 1;
  let coluna = 1;

  function avancar() {
    if (codigo[i] == '\n') {
      linha++;
      coluna = 1;
    } else {
      coluna++;
    }
    i++;
  }

  function addToken(tipo, lexema, lin, col) {
    tokens.push({ token: tipo, lexema: lexema, linha: lin, coluna: col });
  }

  function addErro(msg, lin, col, inicio) {
    erros.push({ msg: msg, linha: lin, coluna: col, inicio: inicio, fim: i });
  }

  while (i < codigo.length) {
    let c = codigo[i];
    let inicio = i;
    let lin = linha;
    let col = coluna;

    // espacos, tab e quebra de linha sao ignorados
    if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
      avancar();
      continue;
    }

    // comentario de uma linha  // ...
    if (c == '/' && codigo[i + 1] == '/') {
      while (i < codigo.length && codigo[i] != '\n') avancar();
      continue;
    }

    // comentario { ... }
    if (c == '{') {
      while (i < codigo.length && codigo[i] != '}') avancar();
      if (i < codigo.length) {
        avancar();
      } else {
        // nao fechou: o resto do arquivo fica como comentario, marca so o "{"
        erros.push({ msg: 'comentário { não foi fechado', linha: lin, coluna: col, inicio: inicio, fim: inicio + 1 });
      }
      continue;
    }

    // comentario (* ... *)
    if (c == '(' && codigo[i + 1] == '*') {
      avancar(); avancar();
      while (i < codigo.length && !(codigo[i] == '*' && codigo[i + 1] == ')')) avancar();
      if (i < codigo.length) {
        avancar(); avancar();
      } else {
        erros.push({ msg: 'comentário (* não foi fechado', linha: lin, coluna: col, inicio: inicio, fim: inicio + 2 });
      }
      continue;
    }

    // identificador ou palavra reservada
    if (ehLetra(c)) {
      while (i < codigo.length && ehLetraDigito(codigo[i])) avancar();
      let texto = codigo.slice(inicio, i);
      let lexema = texto.toLowerCase(); // nao diferencia maiuscula de minuscula

      if (lexema.length > TAM_MAX_ID) {
        addErro('identificador "' + texto + '" passa de ' + TAM_MAX_ID + ' caracteres', lin, col, inicio);
      } else if (RESERVADAS[lexema]) {
        addToken(RESERVADAS[lexema], lexema, lin, col);
      } else {
        addToken('ID', lexema, lin, col);
      }
      continue;
    }

    // numero inteiro (123) ou real (12.5)
    if (ehDigito(c)) {
      while (i < codigo.length && ehDigito(codigo[i])) avancar();
      if (codigo[i] == '.' && ehDigito(codigo[i + 1])) {
        avancar();
        while (i < codigo.length && ehDigito(codigo[i])) avancar();
      }
      // numero grudado em letra, ex: 12abc
      if (i < codigo.length && (ehLetra(codigo[i]) || codigo[i] == '_')) {
        while (i < codigo.length && ehLetraDigito(codigo[i])) avancar();
        addErro('número mal formado "' + codigo.slice(inicio, i) + '"', lin, col, inicio);
        continue;
      }
      addToken('NUM', codigo.slice(inicio, i), lin, col);
      continue;
    }

    // literal entre aspas simples, tem que fechar na mesma linha
    if (c == "'") {
      avancar();
      while (i < codigo.length && codigo[i] != "'" && codigo[i] != '\n') avancar();
      if (codigo[i] == "'") {
        avancar();
        addToken('LITERAL', codigo.slice(inicio, i), lin, col);
      } else {
        addErro('literal não foi fechado (falta a aspa)', lin, col, inicio);
      }
      continue;
    }

    // operadores e pontuacao
    let doisCaracteres = codigo.substr(i, 2);
    if (SIMBOLOS[doisCaracteres]) {
      avancar(); avancar();
      addToken(SIMBOLOS[doisCaracteres], doisCaracteres, lin, col);
      continue;
    }
    if (SIMBOLOS[c]) {
      avancar();
      addToken(SIMBOLOS[c], c, lin, col);
      continue;
    }

    // qualquer outro caractere e invalido ($ % @ # ! ? ...)
    avancar();
    addErro('caractere inválido "' + c + '"', lin, col, inicio);
  }

  return { tokens: tokens, erros: erros, tabelaSimbolos: montarTabelaSimbolos(tokens) };
}

// tabela de simbolos: palavras reservadas, operadores e pontuacao ja entram
// antes da analise, depois entram os identificadores achados no programa
function montarTabelaSimbolos(tokens) {
  let tabela = [];

  for (let p in RESERVADAS) {
    tabela.push({ lexema: p, token: RESERVADAS[p], tipo: 'palavra reservada' });
  }
  for (let s in SIMBOLOS) {
    tabela.push({ lexema: s, token: SIMBOLOS[s], tipo: 'operador/pontuação' });
  }

  let jaTem = {};
  for (let t of tokens) {
    if (t.token == 'ID' && !jaTem[t.lexema]) {
      jaTem[t.lexema] = true;
      tabela.push({ lexema: t.lexema, token: 'ID', tipo: 'identificador (linha ' + t.linha + ')' });
    }
  }
  return tabela;
}

// para rodar os testes no node
if (typeof module != 'undefined') module.exports = { analisar };
