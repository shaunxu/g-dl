import request from "request-promise";
import { spawn } from "child_process";
import { existsSync } from "fs";

const cid: string = "177";
const cookies: string = "_ga=GA1.2.1341244525.1523355991; GCID=e36e8e5-9e27f02-725fb94-275767f; _gid=GA1.2.1548043904.1557712680; GCESS=BAIEQ9DYXAQEAC8NAAYESWExdwUEAAAAAAMEQ9DYXAkBAQwBAQEEKakTAAoEAAAAAAsCBAAIAQMHBPIwmho-; _gat=1; Hm_lvt_022f847c4e3acd44d4a2481d9187f1e6=1557712718,1557712727,1557736269,1557736282; Hm_lpvt_022f847c4e3acd44d4a2481d9187f1e6=1557736282; SERVERID=3431a294a18c59fc8f5805662e2bd51e|1557736282|1557736262";

(async () => {

    console.log(`load playlist from the course #${cid}`);
    const body = await request({
        uri:"https://time.geekbang.org/serv/v1/column/articles",
        method: "POST",
        body: {
            cid: cid,
            order: "earliest",
            prev: 0,
            sample: true,
            size: 200
        },
        json: true,
        headers: {
            "Host": "time.geekbang.org",
            "Accept": "application/json, text/plain, */*",
            "Origin": "https://time.geekbang.org",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.18 Safari/537.36",
            "Content-Type": "application/json",
            "Referer": "https://time.geekbang.org/course/detail/177-93866",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh-TW;q=0.7,zh;q=0.6",
            "Cookie": cookies
        }
    });

    if (body.code !== 0) {
        throw new Error(`failed to load playlist. code = ${body.code}`);
    }
    const courses: {
        article_title: string;
        chapter_id: string;
        id: number;
        video_media_map: {
            hd?: string,
            ld?: string,
            sd?: string
        },
        url?: string;
        type?: string;
    }[] = body.data.list.map((c: any) => {
        const output = {
            article_title: c.article_title,
            chapter_id: c.chapter_id,
            id: c.id,
            video_media_map: {
                hd: c.video_media_map && c.video_media_map.hd && c.video_media_map.hd.url,
                ld: c.video_media_map && c.video_media_map.ld && c.video_media_map.ld.url,
                sd: c.video_media_map && c.video_media_map.sd && c.video_media_map.sd.url
            },
            url: "",
            type: ""
        };
        if (output.video_media_map.ld) {
            output.url = output.video_media_map.ld;
            output.type = "ld";
        }
        else if (output.video_media_map.sd) {
            output.url = output.video_media_map.sd;
            output.type = "sd";
        }
        else if (output.video_media_map.hd) {
            output.url = output.video_media_map.hd;
            output.type = "hd";
        }
        else {
            delete output.url;
            delete output.type;
        }
        return output;
    });
    console.log(`found ${courses.length} videos.`);

    const files: string[] = [];
    for (const course of courses) {
        if (course.url && course.type) {
            const file_name = `${course.chapter_id}-${course.article_title}-${course.type}.mp4`.split(" ").join("");
            console.log(`processing video ${file_name}`);

            await new Promise<number>((resolve, reject) => {
                if (existsSync(file_name)) {
                    return resolve(0);
                }
                else {
                    const ffmpeg = spawn("ffmpeg", [
                        '-i',
                        course.url as string,
                        '-c',
                        'copy',
                        '-bsf:a',
                        'aac_adtstoasc',
                        file_name
                    ]);
                    ffmpeg.stdout.on("data", data => console.log(`${data}`));
                    ffmpeg.stderr.on("data", data => console.error(`${data}`));
                    ffmpeg.on("close", code => resolve(code));
                }
            });
            files.push(file_name);
        }
    }
    return files;

})().then(result => {
    console.log(JSON.stringify(result, null, 2));
    console.log("done");
    process.exit(0);
}).catch(error => {
    console.error(error);
    console.error("fail");
    process.exit(-1);
});