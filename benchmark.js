/// <reference path="modernizr-2.5.3.js" />
/// <reference path="jquery.min.js" />
/// <reference path="three.min.js" />
/// <reference path="three.js" />
/// <reference path="ColladaLoader.js" />

(function ()
{
    //app vars
    var BM = BM || {};

    var camera, scene, renderer;

    BM.meshes = new Array();
    BM.direction = {};
    BM.direction.x = 7;
    BM.direction.y = 14;
    BM.direction.z = -6;

    var i = 0;
    var length = 0;

    var addCubeHandle;

    var fpsHandle, fps = 100, now, lastUpdate = (new Date) * 1 - 1;

    var keepRendering;

    //result vars
    var rendersizewidth;
    var rendersizeheight;
    var canvasAmountOfCubes;
    var canvasScore=0;
    var canvasTotalFrames;
    var canvas2fps;
    var canvas2Score=0;
    var webGLScore=0;
    var webGLfps;
    var webGL2Score=0;
    var webGL2fps;
    var browser;
    var os;

    $(document).ready(function ()
    {
        $(".starttest").click(startTest);
        getBrowser();
        getOS();
    });

    function startTest()
    {
        $(".starttest, .score, .comparison, .donate").hide();
        if (Modernizr.canvas)
        {
            startCanvasTest();
        }
        else
            $(".pleasewait").html('Your browser does not support canvas, maybe you should use <a href="https://www.google.com/intl/nl/chrome/browser/">Google Chrome</a>').show();
    }

    function startFPS()
    {
        $(".fps").show();
        fpsHandle = setInterval(updateFPS, 1000);
    }

    function updateFPS()
    {
        $(".fps").get(0).innerHTML = "Current FPS: " + Math.round(fps);
    }

    function stopFPS()
    {
        $(".fps").hide();
        clearInterval(fpsHandle);
    }

    function startCanvasTest()
    {
        $(".pleasewait").html("Test 1/4: Canvas3D Test 1, please wait and keep this window focused for optimal results...").show();
        $(".extrainfo").html("This is a stress test. Moving blocks will be added to the scene until you drop below 10fps. The score is determined by the amount of blocks.").show();
        canvasInit();
        canvasRender();
        startFPS();
    }

    function stopCanvasTest()
    {
        stopFPS();
        canvasAmountOfCubes = BM.meshes.length;
        canvasScore = Math.ceil(canvasAmountOfCubes / 10);
        canvasClear();
        setTimeout(startCanvasTest2, 500);
    }

    function startCanvasTest2()
    {
        $(".pleasewait").html("Test 2/4: Canvas3D Test 2, please wait and keep this window focused for optimal results...").show();
        $(".extrainfo").html("This test renders 2 sphere wireframes. The score of this test is determined by the average fps.");
        canvas2fps = 0;
        keepRendering = true;
        canvas2Init();
        canvas2Render();
        startFPS();
        setTimeout(stopCanvasTest2, 15000);
    }

    function stopCanvasTest2()
    {
        stopFPS();
        canvas2Score = Math.ceil(canvas2fps / 100);
        keepRendering = false;
        setTimeout(function ()
        {
            canvasClear();
            setTimeout(startWebGLTest,500);
        },50);
    }

    function startWebGLTest()
    {
        if (Modernizr.webgl)
        {
            $(".pleasewait").html("Test 3/4: WebGL Test 1, please wait and keep this window focused for optimal results...");
            $(".extrainfo").html("Rendering some extra elements here such as lights, particles, shadows and opacity. The score of this test is determined by the avarage fps.");
            webGLfps = 0;
            keepRendering = true;
            webGLInit();
            webGLRender();
            startFPS();
            setTimeout(stopWebGLTest, 15000);
        }
        else
        {
            showResults();
        }
    }

    function stopWebGLTest()
    {
        stopFPS();
        webGLScore = Math.ceil(webGLfps / 100);
        keepRendering = false;
        setTimeout(function ()
        {
            canvasClear();
            setTimeout(startWebGLTest2,500);
        }, 50);
    }

    function startWebGLTest2()
    {
        if (Modernizr.webgl)
        {
            $(".pleasewait").html("Test 4/4: WebGL Test 2, please wait and keep this window focused for optimal results...");
            $(".extrainfo").html("This test uses lights, particles, opacity, reflections and antialiasing. The score of this test is determined by the avarage fps.");
            webGL2fps = 0;
            keepRendering = true;
            webGL2Init();
            webGL2Render();
            startFPS();
            setTimeout(stopWebGLTest2, 15000);
        }
        else
        {
            showResults();
        }
    }

    function stopWebGLTest2()
    {
        stopFPS();
        webGL2Score = Math.ceil(webGL2fps / 100);
        keepRendering = false;
        setTimeout(function ()
        {
            canvasClear();
            showResults();
        }, 50);
    }

    function showResults()
    {
        setTimeout(function ()
        {
            $(".extrainfo").hide();
            $(".score").show().get(0).innerHTML = '<p>Canvas score - Test 1: ' + canvasScore + ' - Test 2: ' + canvas2Score + '</p>'
            + (Modernizr.webgl ? '<p>WebGL score - Test 1: ' + webGLScore + ' - Test 2: ' + webGL2Score + '</p>' : '<p>Your browser does not support WebGL</p>')
            + ('<p>Total score: ' + (canvasScore + canvas2Score + webGLScore + webGL2Score) + '</p>');
            $(".starttest, .donate").show();
            $(".pleasewait").hide();
            submitScore();
        }, 1000);
    }

    function submitScore()
    {
        if ((canvasScore + canvas2Score + webGLScore + webGL2Score) > 0)
        {
            var callData = JSON.stringify({
                'serviceName': 'bmark',
                'methodName': 'submitScore',
                'parameters': [{
                    'TotalScore': (canvasScore + canvas2Score + webGLScore + webGL2Score),
                    'Score1': canvasScore,
                    'Score2': canvas2Score,
                    'Score3': webGLScore,
                    'Score4': webGL2Score,
                    'OS': os,
                    'Browser': browser
                }]
            });
            try{
                $.post('../amfphp/Amfphp/?contentType=application/json', callData, function (data)
                {
                    console.log(data);
                    if (data && data.succes)
                    {
                        var totalTests = data.totalTests["count(*)"];
                        var worseTests = data.worseTests["count(*)"];
                        var totalTestsSame = data.totalTestsSameBrowserAndOS["count(*)"];
                        var worseTestsSame = data.worseTestsSameBrowserAndOS["count(*)"];
                        var better = -1;
                        var betterSame = -1;
                        if (totalTests != 0)
                            better = worseTests / totalTests * 100;
                        if (totalTestsSame != 0)
                            betterSame = worseTestsSame / totalTestsSame * 100;
                        var message = '<p>Your results compared to other users:</p>';
                        if (better >= 0)
                        {
                            message += '<p>You score better than ' + Math.round(better) + '% of all users so far!</p>';
                        }
                        else
                        {
                            message += '<p>You are the first user! Thanks for that!</p>';
                        }
                        if (betterSame >= 0)
                        {
                            message += '<p>You score better than ' + Math.round(betterSame) + '% of the people who use the same browser and OS!</p>';
                        }
                        else
                        {
                            message += '<p>You are the first person to use this browser and OS combination!</p>';
                        }
                        $(".comparison").show().get(0).innerHTML = message;
                    }
                });
            }
            catch (err)
            { }
        }
    }

    function getBrowser()
    {
        var b = 'unknown';
        var ua = $.browser;
        if (ua.webkit) b = 'webkit';
        if (window.chrome) b = 'chrome';
        if (ua.msie) b = 'msie';
        if (ua.mozilla) b = 'firefox';
        if (window.opera) b = 'opera';
        browser = b;
    }

    function getOS()
    {
        os = navigator.platform;
    }

    function canvasInit()
    {
        var frontDiv = $(".front");

        rendersizewidth = 800;
        rendersizeheight = 600;
        canvasTotalFrames = 0;

        camera = new THREE.PerspectiveCamera(50, rendersizewidth / rendersizeheight, 1, 10000);
        camera.position.z = 2000;
        camera.position.y = 0;
        camera.position.x = 0;

        scene = new THREE.Scene();
        renderer = new THREE.CanvasRenderer();
        renderer.setSize(rendersizewidth, rendersizeheight);

        $(".renderwindow").prepend($(renderer.domElement).addClass("renderer"));

        addCubeHandle = window.setInterval(addRandomCanvasCube, 1);
        lastUpdate = (new Date) * 1 - 1;
    }

    function canvasRender()
    {
        if (fps > 10 || canvasTotalFrames < 100)
        {
            length = BM.meshes.length;
            for (i = 0; i < length; i++)
            {
                //rotate meshes
                BM.meshes[i].rotation.x += 0.01;
                BM.meshes[i].rotation.y += 0.02;

                //move meshes
                BM.meshes[i].position.x += BM.direction.x;
                BM.meshes[i].position.y += BM.direction.y;
                BM.meshes[i].position.z += BM.direction.z;

                if (BM.meshes[i].position.x >= 2500)
                {
                    BM.meshes[i].position.x = -1500;
                }
                else if (BM.meshes[i].position.x <= -2500)
                {
                    BM.meshes[i].position.x = 1500;
                }
                if (BM.meshes[i].position.y >= 2500)
                {
                    BM.meshes[i].position.y = -1500;
                }
                else if (BM.meshes[i].position.y <= -2500)
                {
                    BM.meshes[i].position.y = 1500;
                }
                if (BM.meshes[i].position.z >= 2500)
                {
                    BM.meshes[i].position.z = -1500;
                }
                else if (BM.meshes[i].position.z <= -2500)
                {
                    BM.meshes[i].position.z = 1500;
                }
            }

            //fps
            fps = 1000 / ((now = new Date) - lastUpdate);
            lastUpdate = now;

            renderer.render(scene, camera);
            canvasTotalFrames++;
            setTimeout(canvasRender, 0);
        }
        else
            stopCanvasTest();
    }

    function canvasClear()
    {
        window.clearInterval(addCubeHandle);
        renderer.clear();
        camera = scene = renderer = null;
        BM.meshes = new Array();
        i = 0;
        length = 0;
        setTimeout(function ()
        {
            $(".renderer").hide().remove();
        }, 0);
    }

    function addRandomCanvasCube()
    {
        addCanvasCube(50, 50, 50, 500 - Math.floor(Math.random() * 1000), 500 - Math.floor(Math.random() * 1000), 500 - Math.floor(Math.random() * 1000));
    }

    function addCanvasCube(width, height, depth, x, y, z)
    {
        var geometry = new THREE.CubeGeometry(width, height, depth, 1, 1);
        var material= new THREE.MeshBasicMaterial({ color: Math.floor(Math.random() * 16777215), wireframe: false });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = x;
        mesh.position.y = y;
        mesh.position.z = z;
        scene.add(mesh);
        BM.meshes.push(mesh);
    }

    function canvas2Init()
    {
        var frontDiv = $(".front");

        rendersizewidth = 800;
        rendersizeheight = 600;

        camera = new THREE.PerspectiveCamera(50, rendersizewidth / rendersizeheight, 1, 10000);
        camera.position.z = 2000;
        camera.position.y = 0;
        camera.position.x = 0;

        scene = new THREE.Scene();
        renderer = new THREE.CanvasRenderer();
        renderer.setSize(rendersizewidth, rendersizeheight);

        $(".renderwindow").prepend($(renderer.domElement).addClass("renderer"));

        //adding objects
        var geometry = new THREE.SphereGeometry(1000, 50, 50);
        var material = new THREE.MeshBasicMaterial({ color: Math.floor(Math.random() * 16777215), wireframe: true });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = 0;
        mesh.position.y = 0;
        mesh.position.z = 0;
        scene.add(mesh);
        BM.meshes.push(mesh);

        var geometry = new THREE.SphereGeometry(300, 40, 40);
        var material = new THREE.MeshBasicMaterial({ color: Math.floor(Math.random() * 16777215), wireframe: true });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = -500;
        mesh.position.y = -500;
        mesh.position.z = 500;
        scene.add(mesh);
        BM.meshes.push(mesh);

        lastUpdate = (new Date) * 1 - 1;
    }

    function canvas2Render()
    {
        if (keepRendering)
        {
            //fps
            fps = 1000 / ((now = new Date) - lastUpdate);
            lastUpdate = now;
            canvas2fps += fps;

            BM.meshes[0].rotation.y += 0.001;
            BM.meshes[1].rotation.y -= 0.002;

            renderer.render(scene, camera);
            setTimeout(canvas2Render, 0);
        }
    }

    function webGLInit()
    {
        var frontDiv = $(".front");

        rendersizewidth = 800;
        rendersizeheight = 600;

        camera = new THREE.PerspectiveCamera(50, rendersizewidth / rendersizeheight, 1, 10000);
        camera.position.z = 2000;
        camera.position.y = 0;
        camera.position.x = 0;

        scene = new THREE.Scene();
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(rendersizewidth, rendersizeheight);

        $(".renderwindow").prepend($(renderer.domElement).addClass("renderer"));

        //adding objects
        var geometry = new THREE.SphereGeometry(1000, 50, 50);
        var material = new THREE.MeshLambertMaterial({ color: 0x661133, wireframe: false });
        material.opacity = 0.8;
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = 0;
        mesh.position.y = 0;
        mesh.position.z = 0;
        scene.add(mesh);
        BM.meshes.push(mesh);

        var geometry = new THREE.SphereGeometry(300, 40, 40);
        var material = new THREE.MeshLambertMaterial({ color: 0x772244, wireframe: false });
        material.opacity = 0.95;
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = -500;
        mesh.position.y = -500;
        mesh.position.z = 500;
        scene.add(mesh);
        BM.meshes.push(mesh);

        var geometry = new THREE.SphereGeometry(50, 100, 100);
        var material = new THREE.MeshLambertMaterial({ color: 0x883355, wireframe: false });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = -700;
        mesh.position.y = -400;
        mesh.position.z = 750;
        scene.add(mesh);

        var light = new THREE.PointLight(0xFFFFFF);
        light.position.x = 0;
        light.position.y = 0;
        light.position.z = 2000;
        scene.add(light);

        var light2 = new THREE.SpotLight(0xffffff);
        light2.position.set(-2000, 0, 2000);
        light2.castShadow = true;
        light2.shadowMapWidth = 1024;
        light2.shadowMapHeight = 1024;
        light2.shadowCameraNear = 200;
        light2.shadowCameraFar = 2000;
        light2.shadowCameraFov = 30;
        scene.add(light2);

        // create the particle variables
        var particleCount = 10000,
            particles = new THREE.Geometry(),
            pMaterial =
          new THREE.ParticleBasicMaterial({
              color: 0x9900FF,
              size: 3,
              blending: THREE.AdditiveBlending,
              transparent: true
          });

        for (var p = 0; p < particleCount; p++)
        {
            var pX = Math.random() * 2000 - 1000,
                pY = Math.random() * 2000 - 1000,
                pZ = Math.random() * 2000 - 1000,
                particle = new THREE.Vector3(pX, pY, pZ);

            particles.vertices.push(particle);
        }

        var particleSystem =
          new THREE.ParticleSystem(
            particles,
            pMaterial);

        particleSystem.sortParticles = true;

        scene.add(particleSystem);
        BM.meshes.push(particleSystem);


        //2e
        particleCount = 10000,
            particles = new THREE.Geometry(),
            pMaterial =
          new THREE.ParticleBasicMaterial({
              color: 0xDDDD00,
              size: 3,
              blending: THREE.AdditiveBlending,
              transparent: true
          });

        for (var p = 0; p < particleCount; p++)
        {
            var pX = Math.random() * 2000 - 1000,
                pY = Math.random() * 2000 - 1000,
                pZ = Math.random() * 2000 - 1000,
                particle = new THREE.Vector3(pX, pY, pZ);

            particles.vertices.push(particle);
        }

        var particleSystem =
          new THREE.ParticleSystem(
            particles,
            pMaterial);

        particleSystem.sortParticles = true;

        scene.add(particleSystem);
        BM.meshes.push(particleSystem);

        lastUpdate = (new Date) * 1 - 1;
    }

    function webGLRender()
    {
        if (keepRendering)
        {
            //fps
            fps = 1000 / ((now = new Date) - lastUpdate);
            lastUpdate = now;
            webGLfps += fps;

            BM.meshes[0].rotation.y += 0.001;
            BM.meshes[1].rotation.y -= 0.002;
            BM.meshes[2].rotation.y -= 0.001;
            BM.meshes[2].rotation.x -= 0.001;
            BM.meshes[3].rotation.y += 0.001;
            BM.meshes[3].rotation.z -= 0.001;
            BM.meshes[3].rotation.x += 0.001;

            renderer.render(scene, camera);
            setTimeout(webGLRender, 0);
        }
    }

    function webGL2Init()
    {
        var frontDiv = $(".front");

        rendersizewidth = 800;
        rendersizeheight = 600;

        camera = new THREE.PerspectiveCamera(50, rendersizewidth / rendersizeheight, 1, 10000);
        camera.position.z = 2000;
        camera.position.y = 0;
        camera.position.x = 0;

        scene = new THREE.Scene();
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(rendersizewidth, rendersizeheight);

        $(".renderwindow").prepend($(renderer.domElement).addClass("renderer"));

        //adding objects
        var geometry = new THREE.CubeGeometry(100, 100, 100);
        var geometry2 = new THREE.CubeGeometry(200, 200, 200);
        var geometry3 = new THREE.CubeGeometry(2000, 2000, 2000);
        var material = new THREE.MeshLambertMaterial({ color: 0x661133, wireframe: false });
        var material2 = new THREE.MeshLambertMaterial({ color: 0x661133, wireframe: false });
        material2.opacity = 0.8;
        var material3 = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, wireframe: false });

        var mesh = new THREE.Mesh(geometry2, material);
        mesh.position.x = -1000;
        mesh.position.y = -400;
        mesh.position.z = 1000;
        scene.add(mesh);
        
        var mesh2 = new THREE.Mesh(geometry, material2);
        mesh2.position.x = -800;
        mesh2.position.y = -400;
        mesh2.position.z = 1000;
        scene.add(mesh2);
        BM.meshes.push(mesh2);

        var mesh3 = new THREE.Mesh(geometry, material);
        mesh3.position.x = -600;
        mesh3.position.y = -400;
        mesh3.position.z = 1000;
        scene.add(mesh3);

        var mesh4 = new THREE.Mesh(geometry, material2);
        mesh4.position.x = -400;
        mesh4.position.y = -400;
        mesh4.position.z = 1000;
        scene.add(mesh4);
        BM.meshes.push(mesh4);

        var mesh5 = new THREE.Mesh(geometry, material);
        mesh5.position.x = -200;
        mesh5.position.y = -400;
        mesh5.position.z = 1000;
        scene.add(mesh5);

        var mesh6 = new THREE.Mesh(geometry, material2);
        mesh6.position.x = 0;
        mesh6.position.y = -400;
        mesh6.position.z = 1000;
        scene.add(mesh6);
        BM.meshes.push(mesh6);

        var mesh7 = new THREE.Mesh(geometry, material);
        mesh7.position.x = 200;
        mesh7.position.y = -400;
        mesh7.position.z = 1000;
        scene.add(mesh7);

        var mesh8 = new THREE.Mesh(geometry, material2);
        mesh8.position.x = 400;
        mesh8.position.y = -400;
        mesh8.position.z = 1000;
        scene.add(mesh8);
        BM.meshes.push(mesh8);

        var mesh9 = new THREE.Mesh(geometry, material);
        mesh9.position.x = 600;
        mesh9.position.y = -400;
        mesh9.position.z = 1000;
        scene.add(mesh9);

        var mesh10 = new THREE.Mesh(geometry, material2);
        mesh10.position.x = 800;
        mesh10.position.y = -400;
        mesh10.position.z = 1000;
        scene.add(mesh10);
        BM.meshes.push(mesh10);

        var mesh11 = new THREE.Mesh(geometry, material);
        mesh11.position.x = 1000;
        mesh11.position.y = -400;
        mesh11.position.z = 1000;
        scene.add(mesh11);

        var mesh20 = new THREE.Mesh(geometry3, material3);
        mesh20.position.x = -3000;
        mesh20.position.y = 0;
        mesh20.position.z = 4100;
        scene.add(mesh20);

        var mesh21 = new THREE.Mesh(geometry3, material3);
        mesh21.position.x = 0;
        mesh21.position.y = 0;
        mesh21.position.z = 4100;
        scene.add(mesh21);

        var mesh22 = new THREE.Mesh(geometry3, material3);
        mesh22.position.x = 3000;
        mesh22.position.y = 0;
        mesh22.position.z = 4100;
        scene.add(mesh22);

        var mesh23 = new THREE.Mesh(geometry3, material3);
        mesh23.position.x = -1500;
        mesh23.position.y = 2500;
        mesh23.position.z = 4100;
        scene.add(mesh23);

        var mesh24 = new THREE.Mesh(geometry3, material3);
        mesh24.position.x = 1500;
        mesh24.position.y = 2500;
        mesh24.position.z = 4100;
        scene.add(mesh24);


        var light = new THREE.PointLight(0xFFFFFF);
        light.position.x = 0;
        light.position.y = 0;
        light.position.z = 0;
        scene.add(light);

        //reflecting sphere
        var sphereGeom = new THREE.SphereGeometry(400, 32, 16); // radius, segmentsWidth, segmentsHeight
        mirrorSphereCamera = new THREE.CubeCamera(0.1, 5000, 512);
        scene.add(mirrorSphereCamera);
        var mirrorSphereMaterial = new THREE.MeshBasicMaterial({ envMap: mirrorSphereCamera.renderTarget });
        mirrorSphere = new THREE.Mesh(sphereGeom, mirrorSphereMaterial);
        mirrorSphere.position.set(-300, -200, 500);
        mirrorSphereCamera.position = mirrorSphere.position;
        scene.add(mirrorSphere);
        BM.meshes.push(mirrorSphere);
        BM.meshes.push(mirrorSphereCamera);

        // create the particle variables
        var particleCount = 20,
            particles = new THREE.Geometry(),
            pMaterial =
          new THREE.ParticleBasicMaterial({
              color: 0xFF6600,
              size: 50,
              blending: THREE.AdditiveBlending,
              transparent: false
          });

        for (var p = 0; p < particleCount; p++)
        {
            var pX = Math.random() * 2000 - 1000,
                pY = Math.random() * 250 - 800,
                pZ = Math.random() * 500 + 500,
                particle = new THREE.Vector3(pX, pY, pZ);

            particles.vertices.push(particle);
        }

        var particleSystem =
          new THREE.ParticleSystem(
            particles,
            pMaterial);

        particleSystem.position.set(0, 0, 400);

        particleSystem.sortParticles = true;

        scene.add(particleSystem);
        BM.meshes.push(particleSystem);

        //2e particles
        particleCount = 3000,
            particles = new THREE.Geometry(),
            pMaterial =
          new THREE.ParticleBasicMaterial({
              color: 0x66CCFF,
              size: 10,
              blending: THREE.AdditiveBlending,
              transparent: false
          });

        for (var p = 0; p < particleCount; p++)
        {
            var pX = Math.random() * 2000 - 1000,
                pY = Math.random() * 250 - 150,
                pZ = Math.random() * 500 - 250,
                particle = new THREE.Vector3(pX, pY, pZ);

            particles.vertices.push(particle);
        }

        var particleSystem =
          new THREE.ParticleSystem(
            particles,
            pMaterial);

        particleSystem.position.set(0, -600, 800);

        particleSystem.sortParticles = true;

        scene.add(particleSystem);
        BM.meshes.push(particleSystem);

        lastUpdate = (new Date) * 1 - 1;
    }

    function webGL2Render()
    {
        if (keepRendering)
        {
            //fps
            fps = 1000 / ((now = new Date) - lastUpdate);
            lastUpdate = now;
            webGL2fps += fps;

            BM.meshes[0].rotation.x += 0.005;
            BM.meshes[1].rotation.x -= 0.003;
            BM.meshes[2].rotation.x += 0.005;
            BM.meshes[3].rotation.x -= 0.003;
            BM.meshes[4].rotation.x += 0.005;

            BM.meshes[5].visible = false;
            BM.meshes[5].position.x += 1;
            BM.meshes[6].position = BM.meshes[5].position;
            BM.meshes[6].updateCubeMap(renderer, scene);
            BM.meshes[5].visible = true;

            BM.meshes[7].rotation.x += 0.01;
            BM.meshes[7].rotation.x += 0.04;

            renderer.render(scene, camera);
            setTimeout(webGL2Render, 0);
        }
    }

})();
