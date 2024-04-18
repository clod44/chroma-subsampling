function setup() {
    //Do not delete this function or p5js won't initialize.
}


function rgbToYCbCr(r, g, b) {
    let y = 0.299 * r + 0.587 * g + 0.114 * b;
    let cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    let cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    y = Math.max(0, Math.min(255, y));
    cb = Math.max(0, Math.min(255, cb));
    cr = Math.max(0, Math.min(255, cr));

    return { y: y, cb: cb, cr: cr };
}

function ycbcrToRgb(y, cb, cr) {
    let r = y + 1.402 * (cr - 128);
    let g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
    let b = y + 1.772 * (cb - 128);

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    return { r: r, g: g, b: b };
}


function downscale(image, amount) {
    let temp = createGraphics(image.width / amount, image.height / amount);
    let final = createGraphics(image.width, image.height);
    temp.image(image, 0, 0, temp.width, temp.height);
    final.image(temp, 0, 0, final.width, final.height);
    return final;
}

function subsampleRGB(image, amount) { //R
    let final = createGraphics(image.width, image.height);
    final.image(image, 0, 0);

    //this will allow quick pixel averaging
    let temp = createGraphics(image.width / amount, image.height / amount);
    temp.image(final, 0, 0, temp.width, temp.height);
    let subsampled = createGraphics(image.width, image.height);
    subsampled.image(temp, 0, 0, subsampled.width, subsampled.height);

    subsampled.loadPixels();
    final.loadPixels();
    for (let y = 0; y < final.height; y++) {
        for (let x = 0; x < final.width; x++) {
            let index = (x + y * final.width) * 4;
            let ri = final.pixels[index];
            let gsi = subsampled.pixels[index + 1];
            let bsi = subsampled.pixels[index + 2];

            final.pixels[index] = ri;
            final.pixels[index + 1] = gsi;
            final.pixels[index + 2] = bsi;
        }
    }
    final.updatePixels();

    return final;
}

function subsampleYCbCr(image, amount) { //Y
    let final = createGraphics(image.width, image.height);
    final.image(image, 0, 0);

    //this will allow quick pixel averaging
    let temp = createGraphics(image.width / amount, image.height / amount);
    temp.image(final, 0, 0, temp.width, temp.height);
    let subsampled = createGraphics(image.width, image.height);
    subsampled.image(temp, 0, 0, subsampled.width, subsampled.height);

    subsampled.loadPixels();
    final.loadPixels();
    for (let y = 0; y < final.height; y++) {
        for (let x = 0; x < final.width; x++) {
            let index = (x + y * final.width) * 4;
            let ri = final.pixels[index];
            let gi = final.pixels[index + 1];
            let bi = final.pixels[index + 2];
            let ycbcri = rgbToYCbCr(ri, gi, bi);

            let gsi = subsampled.pixels[index + 1];
            let bsi = subsampled.pixels[index + 2];
            let ycbcrsi = rgbToYCbCr(ri, gsi, bsi);

            let rgb = ycbcrToRgb(
                ycbcri.y,
                ycbcrsi.cb,
                ycbcrsi.cr);
            final.pixels[index] = rgb.r;
            final.pixels[index + 1] = rgb.g;
            final.pixels[index + 2] = rgb.b;
        }
    }
    final.updatePixels();

    return final;
}

$(document).ready(function () {
    $("#form-subsample").submit(function (event) {
        event.preventDefault();
        $("#results").empty();

        let subsamplingAmount = parseInt($("#input-subsampling-amount").val());
        let imgElement = $("#img-test-image")[0];

        loadImage(imgElement.src, function (img) {
            let subsampledImgYCbCr = subsampleYCbCr(img, subsamplingAmount);
            let subsampledImgRGB = subsampleRGB(img, subsamplingAmount);
            let downscaledImg = downscale(img, subsamplingAmount);

            displaySubsampledImage(subsampledImgYCbCr, "Y-CbCr", subsamplingAmount);

            displaySubsampledImage(subsampledImgRGB, "R-GB", subsamplingAmount);

            displaySubsampledImage(downscaledImg, "Downscaled 1:" + subsamplingAmount, subsamplingAmount);

            displayImageInfo(img.width, img.height, subsamplingAmount);
        });
    });


    function displaySubsampledImage(subsampledImg, type, subsamplingAmount) {
        let newImg = $("<img>");
        newImg.attr("src", subsampledImg.canvas.toDataURL());

        let imgElement = $("#img-test-image");
        if (imgElement.length > 0) {
            let classes = imgElement.attr("class");
            if (classes) {
                newImg.addClass(classes);
            }
        }

        $("#results").append("<span>" + type + " subsampled " + subsamplingAmount + " pixels:</span>");
        $("#results").append(newImg);
    }


    function displayImageInfo(w, h, subsamplingAmount) {
        let pixelcount = w * h;
        let rawSizeRGB = pixelcount * (8 + 8 + 8); // RGB: 8 bits per channel (24 bits per pixel)
        let rawSizeYCbCr = pixelcount * 8 + (pixelcount / subsamplingAmount) * (4 + 4); // YCbCr: Y (8 bits) + Cb (4 bits) + Cr (4 bits) per pixel
        //^ this is just "technically"
        let texts = [
            "Subsampling amount: " + subsamplingAmount,
            "Image dimensions: " + w + "x" + h,
            "Raw size (RGB): " + sizeConvert(rawSizeRGB).text,
            "Raw subsampled size (YCbCr): " + sizeConvert(rawSizeYCbCr).text,
        ];

        $("#info").empty();
        texts.forEach(text => {
            $("#info").append("<li class='list-group-item'>" + text + "</li>");
        });
    }


    function sizeConvert(s) {
        let sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        let ops = 0;
        while (s > 1000) {
            ops++;
            s = s / 1000.0;
        }
        s = s.toFixed(2);
        return { value: s, label: sizes[ops], text: s + " " + sizes[ops] };
    }

    $("#input-custom-image").on("change", function () {
        $("#results").empty();
        $("#info").empty();
        let imgElement = $("#img-test-image")[0];
        imgElement.src = URL.createObjectURL(this.files[0]);
    });
    $("#range-subsampling-amount").on("input change", function () {
        $("#input-subsampling-amount").val(this.value);
    });
});
