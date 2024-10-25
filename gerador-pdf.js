require("dotenv").config();
const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function createPdf() {
  try {
    const { data: perguntas, error: error_perguntas } = await supabase
      .from("questions")
      .select("*");
    const { data: questoes, error: error_questoes } = await supabase
      .from("answers")
      .select("*");

    const organizedData = perguntas.map((pergunta) => {
      return {
        ...pergunta,
        respostas: questoes.filter(
          (questao) => questao.question_id === pergunta.id
        ),
      };
    });

    console.log(JSON.stringify(organizedData));

    if (error_questoes || error_perguntas) {
      throw console.error(error_questoes, error_perguntas);
    }

  
    const pdfDoc = await PDFDocument.create();

  
    const page = pdfDoc.addPage([600, 800]);

  
    const fontSize = 14;
    const { width, height } = page.getSize();
    let posY = height - 50;

  
    page.drawText("Prova de Conhecimentos Gerais", {
      x: 50,
      y: posY,
      size: 18,
      color: rgb(0, 0, 0),
    });
    posY -= 40;

  
    organizedData.forEach((question, index) => {
    
      page.drawText(`${index + 1}. ${question.text}`, {
        x: 50,
        y: posY,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      posY -= 30;

    
      question.respostas.forEach((answer, idx) => {
        page.drawText(
          `   ${String.fromCharCode(97 + idx)}. ${answer.answers_text}`,
          {
            x: 70,
            y: posY,
            size: fontSize - 2,
            color: rgb(0, 0, 0),
          }
        );
        posY -= 20;
      });

      posY -= 20;
    });

  
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync("prova.pdf", pdfBytes);

    console.log("PDF criado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar o PDF:", error);
  }
}

createPdf();
