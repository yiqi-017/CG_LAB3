import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

export async function POST(request: Request) {
  try {
    // const { prompt } = await request.json();
    const systemMessage = "你是一个专业的 CAD 建模师，你的任务是使用精准、清晰、专业的语言，对机械零件进行简短的英文的描述，并生成详细的、分步的英文的 CAD 建模说明，\
    包括简单形状（如圆柱体、立方体）、复合结构（如齿轮、框架）的几何体，\
    输出内容建议包括：\
    1. 在原点设置坐标系，不进行旋转，指定欧拉角 (0.0, 0.0, 0.0) 和平移矢量 (0.0, 0.0, 0.0)。\
    2. 在坐标系的相应面上创建二维草图，描述形状，例如圆或环，并指定圆心坐标和半径。\
    3. 拉伸或其他特征操作，包括方向、深度、缩放比例以及任何实体创建步骤。\
    4. 零件关键尺寸的摘要，根据需要指定长度、宽度、高度或半径。\
    收到简短零件描述时，务必输出详细的 CAD 建模指令，且不遗漏任何步骤和细节。\
    请注意你只能回答对应的英文建模创建过程的描述且不能分段，不能使用1.2.3.4而是用First、Second等连接词，不能带有其他内容。\
    给你两个输入输出的例子：\
    输入1: a hollow Cylinder\
    输出1: Create the first part of the CAD model, an intermediate cylindrical object. Begin by setting up a new coordinate system at the origin with no rotation, where the Euler angles are set to (0.0, 0.0, 0.0) and the translation vector is (0.0, 0.0, 0.0). \
Next, create a 2D sketch on Face 1 of the coordinate system. Within the sketch, construct two concentric circles as loops. Loop 1 is a circle with a center at (0.1875, 0.1875) and radius of 0.1875. Loop 2 is also a circle with the same center at (0.1875, 0.1875) but with a smaller radius of 0.0754.\
Now, extrude the sketch along the normal direction by a depth of 0.75, and ensure no depth in the opposite direction. Set the scaling parameter for the sketch to 0.375. Perform a 'New Body' operation to create a new solid body from the extruded sketch.\
The first part has the following dimensions: length of 0.375 (from the sketch scale), width of 0.375 (from the sketch scale), and height of 0.75 (from the extrude depth). This part closely resembles a cylindrical object, slightly curved along its length.\
    输入2: a stepped mounting block with internal hole and side bracket\
    输出2: Create the first part of the CAD model, a stepped mounting block. First, set up a new coordinate system at the origin with no rotation, where the Euler angles are set to (0.0, 0.0, 0.0) and the translation vector is (0.0, 0.0, 0.0). Next, create a 2D sketch on Face 1 of the coordinate system. Within the sketch, construct a rectangle with dimensions 2.0 in length and 1.5 in width, centered at (0.0, 0.0). Then, extrude this sketch along the normal direction by a height of 0.5 to form the base block. Second, create another 2D sketch on the top face of the base block. Draw a smaller rectangle with dimensions 1.5 in length and 1.0 in width, centered at (0.0, 0.0), and extrude it by an additional height of 0.5 to form the stepped section. Third, create a third 2D sketch on the top face of the stepped section. Construct a circle with a radius of 0.3 centered at (0.0, 0.0), and perform a cut operation through the entire height of both blocks to create the internal hole. Fourth, set up a new coordinate system on the side face of the base block with a translation vector of (1.0, 0.0, 0.25) to position the side bracket. Create a 2D sketch on this face and draw an L-shaped profile with legs of length 1.0 and width 0.25. Extrude this sketch by a depth of 0.5 to form the side bracket. The final part has the following dimensions: base block dimensions of 2.0 (length) x 1.5 (width) x 0.5 (height), stepped section dimensions of 1.5 (length) x 1.0 (width) x 0.5 (height), internal hole diameter of 0.6, and side bracket dimensions of 1.0 (length) x 0.5 (width) x 0.25 (thickness).\
";
    // 另一个使用OpenSCAD的系统提示词：
    /*
    你是一名熟练的 CAD 程序员，专注于根据自然语言描述生成 OpenSCAD 代码。
    
    当接收到简短的三维零件描述时，你必须输出清晰、结构化且可直接运行的 OpenSCAD 代码，准确表示所描述的零件。代码要求包括：
    
    1. 必要时使用模块定义（module）。
    2. 使用基本的 OpenSCAD 基元（如 cube、cylinder、sphere 等）和变换操作。
    3. 添加有意义的注释，解释每个部分和操作。
    4. 根据描述设定合理的默认尺寸和参数。
    5. 代码格式美观，易于阅读。
    
    默认假设坐标系原点为 (0,0,0)，零件应居中或合理定位。
    
    例如输入为“一个盒子”，输出应为带注释的创建盒子的 OpenSCAD 代码。
    
    不要输出任何非代码内容。
    */


    const { prompt } = await request.json();
    console.log("------------------------------")
    console.log(prompt)

    // 2. 调用 OpenAI 生成最终 prompt
    const openaiRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        "model": 'deepseek-chat',
        "messages": [
          { "role": "system", "content": systemMessage },
          { "role": "user",   "content": prompt },
        ],
        "temperature": 1.3,
      }),
    });
    // console.log(openaiRes)
    
    if (!openaiRes.ok) {
      throw new Error(`OpenAI 接口错误：${openaiRes.status}`);
    }
    const openaiData = await openaiRes.json();
    const finalPrompt = openaiData.choices?.[0]?.message?.content?.trim();
    if (!finalPrompt) {
      throw new Error('OpenAI 未生成有效 prompt');
    }
    console.log("-------------------------")
    console.log('🔑 Generated prompt:', finalPrompt);

    // 创建一个 Promise 来处理 Python 脚本的执行
    const result = await new Promise<string>((resolve, reject) => {
      const safePrompt = JSON.stringify(finalPrompt);
      const pythonProcess = spawn('python', ['-c', `
import time
from kittycad.api.ml import create_text_to_cad, get_text_to_cad_model_for_user
from kittycad.client import Client
from kittycad.models import (
    ApiCallStatus,
    Error,
    FileExportFormat,
    TextToCad,
    TextToCadCreateBody,
)

client = Client(token="api-fb04cd8b-6a3b-4eef-8866-33b25010bb0c")

response = create_text_to_cad.sync(
    client=client,
    output_format=FileExportFormat.STEP,
    body=TextToCadCreateBody(
        prompt=${safePrompt},
    ),
)

if isinstance(response, Error) or response is None:
    print("Error: " + str(response))
    exit(1)

result: TextToCad = response

while result.completed_at is None:
    time.sleep(5)
    response = get_text_to_cad_model_for_user.sync(
        client=client,
        id=result.id,
    )
    if isinstance(response, Error) or response is None:
        print("Error: " + str(response))
        exit(1)
    result = response

if result.status == ApiCallStatus.COMPLETED:
    if result.outputs is None:
        print("生成完成，但未返回任何文件。")
        exit(0)
    final_result = result.outputs["source.step"]
    print(final_result.decode("utf-8"))
      `]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(error || 'Python script execution failed');
        }
      });
    });

    // 自动写入本地 model.step 文件（每次覆盖）
    const stepFilePath = path.join(process.cwd(), 'model.step');
    fs.writeFileSync(stepFilePath, result as string, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      prompt,
      result: result 
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '写入文件错误' 
    });
  }
} 