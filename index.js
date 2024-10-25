require("dotenv").config();
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const readline = require("readline");

// Conexão com o Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getOpenAIResponse(prompt) {
  const openAIKey = process.env.OPENAI_API_KEY;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Resposta da IA:", response.choices);
    const completion = response;
    return completion;
  } catch (error) {
    console.error("Erro ao chamar a API:", error);
  }
}

// Função para salvar a resposta no Supabase
async function saveAnswers(question_id, answers_text, is_correct = false) {
  const { data: data_answers, error: error_insert_answers } = await supabase
    .from("answers")
    .insert([
      {
        question_id: question_id,
        answers_text: answers_text,
        is_correct: is_correct,
      },
    ]);

  if (error_insert_answers) {
    console.error("Erro ao salvar no Supabase:", error_insert_answers.message);
  } else {
    console.log("Resposta salva com sucesso:", data_answers);
  }
}

async function saveQuestion(text, tag = null, difficulty = null) {
  const { data, error } = await supabase
    .from("questions")
    .insert({ text, tag, difficulty })
    .select(); // Adiciona .select() para retornar os dados da linha inserida

  if (error) {
    console.error("Erro ao salvar no Supabase:", error.message);
    return null; // Retorna null em caso de erro para indicar falha
  }

  console.log("Pergunta salva com sucesso:", text, tag, difficulty);
  return data; // Retorna os dados da pergunta salva para uso posterior
}

async function main() {
  let question = {};

  let response = [];

  try {
    let prompt = `
    Crie uma questão inéditas de alta qualidade para um concurso dos Correios, com base nos seguintes tópicos do conteúdo programático oficial. As questões devem ser geradas uma por vez, e aglutinadas por matéria. Utilize o modelo JSON de resposta abaixo, responda somente utilizando esse modelo:
    {"text": "Insira o enunciado da questão aqui.", "tag": "área_de_conhecimento", "difficulty": 1 }
    [{"text": "Opção A", "is_correct": true }, { "text": "Opção B", "is_correct": false }, { "text": "Opção C", "is_correct": false }, { "text": "Opção D", "is_correct": false }, { "text": "Opção E", "is_correct": false }]
    `;

    const resposta = await getOpenAIResponse(prompt);
    const formatResponse = resposta.data.choices[0].message.content.split("\n");
    question = JSON.parse(formatResponse[0]);
    response = JSON.parse(formatResponse[1]);

    console.log("Pergunta:", question);
    console.log("Respostas:", response);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`Deseja salvar a questão? (s/n) `, async (answer) => {
      if (answer.toLowerCase() === "s") {
        const questionData = await saveQuestion(
          question.text,
          question.tag,
          question.difficulty
        );

        // Use o ID da pergunta salva para relacionar as respostas
        if (questionData) {
          const question_id = questionData[0].id; // Acessa o ID da primeira (e única) pergunta salva

          // Salva cada resposta individualmente
          for (const answer of response) {
            await saveAnswers(question_id, answer.text, answer.is_correct);
          }
        }
      } else {
        console.log("Questão não salva.");
      }

      rl.close();
    });
  } catch (error) {
    console.error("Erro na execução:", error.message);
  }
}

main();
