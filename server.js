/********************************************************************************* 

WEB322 – Assignment 03
I declare that this assignment is my own work in accordance with Seneca
Academic Policy.  No part of this assignment has been copied manually or 
electronically from any other source (including 3rd party web sites) or 
distributed to other students. I acknoledge that violation of this policy
to any degree results in a ZERO for this assignment and possible failure of
the course. 

Name:   Rohan
Student ID:   170442214
Date:  24 June 2023
********************************************************************************/



const express = require("express");
const itemData = require("./store-service");
const path = require("path");

// 3 new modules, multer, cloudinary, streamifier
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const exphbs = require('express-handlebars');



// Configure Cloudinary. This API information is
// inside of the Cloudinary Dashboard - https://console.cloudinary.com/
cloudinary.config({
  cloud_name: "",
  api_key: "",
  api_secret: "",
  secure: true,
});

//  "upload" variable without any disk storage
const upload = multer(); // no { storage: storage }

const app = express();

app.engine('hbs', exphbs.engine({ extname: '.hbs' }));


const HTTP_PORT = process.env.PORT || 8080;

onHttpStart = () => {
	console.log('Express http server listening on port ' + HTTP_PORT);
};

app.use(express.static("public"));
//adding middleware function
 app.use(function(req,res,next){
  let route = req.path.substring(1);
  app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
  app.locals.viewingCategory = req.query.category;
  next();
});

app.engine(
	'.hbs',
	exphbs.engine({
		extname: '.hbs',
		helpers: {
			navLink: function (url, options) {
				return `<a class="nav-link ${
					url == app.locals.activeRoute ? 'active' : ''
				}" href="${url}">${options.fn(this)}</a>`;
			},
			equal: function (lvalue, rvalue, options) {
				if (arguments.length < 3)
					throw new Error('Handlebars Helper equal needs 2 parameters');
				if (lvalue != rvalue) {
					return options.inverse(this);
				} else {
					return options.fn(this);
				}
			},
			safeHTML: function (context) {
				return stripJs(context);
			},
		},
	}),
);
app.set('view engine', 'hbs');

// app.get("/", (req, res) => {
//   res.redirect("/about");
// });
  
//replacing app.get(/shop)
app.get("/shop", async (req, res) => {
  // Declare an object to store properties for the view
  let viewData = {};

  try {
    // declare empty array to hold "post" objects
    let items = [];

    // if there's a "category" query, filter the returned posts by category
    if (req.query.category) {
      // Obtain the published "posts" by category
      items = await itemData.getPublishedItemsByCategory(req.query.category);
    } else {
      // Obtain the published "items"
      items = await itemData.getPublishedItems();
    }

    // sort the published items by postDate
    items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

    // get the latest post from the front of the list (element 0)
    let post = items[0];

    // store the "items" and "post" data in the viewData object (to be passed to the view)
    viewData.items = items;
    viewData.item = item;
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    // Obtain the full list of "categories"
    let categories = await itemData.getCategories();

    // store the "categories" data in the viewData object (to be passed to the view)
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }

  // render the "shop" view with all of the data (viewData)
  res.render("shop", { data: viewData });
});

// app.get fot about
app.get("/about", (req, res) => {
  res.render('about');
});

app.get("/store", (req, res) => {
  itemData
    .getPublishedItems()
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});

// Accept queryStrings
app.get('/items', (req,res)=>
{

    let queryPromise = null;

    // check if there is a query for Category
    if(req.query.category){
        // get the data for category id only.
        queryPromise = itemData.getItemsByCategory(req.query.category);
    }else if(req.query.minDate){
        // get the data for date only.
        queryPromise = itemData.getItemsByMinDate(req.query.minDate);
    }else{
        // otherwise just get everything.
        queryPromise = itemData.getAllItems()
    } 

    queryPromise.then(data=>{
        res.render("items", {items: data});
    }).catch(err=>{
      res.render("items", {message: "err"});
    })

});
app.set('views', path.join(__dirname, 'views'));
// A route for items/add
app.get("/items/add", (req, res) => {
  res.render('add-item');
});

app.post("/items/add", upload.single("featureImage"), (req, res) => {
  if (req.file) {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    async function upload(req) {
      let result = await streamUpload(req);

      console.log(result);

      return result;
    }

    upload(req).then((uploaded) => {
      processItem(uploaded.url);
    });
  } else {
    processItem("");
  }

  function processItem(imageUrl) {
    req.body.featureImage = imageUrl;

    // TODO: Process the req.body and add it as a new Item before redirecting to /items
    itemData
      .addItem(req.body)
      .then((post) => {
        res.redirect("/items");
      })
      .catch((err) => {
        res.status(500).send(err);
      });
  }
});

// Get an individual item
app.get('/item/:id', (req,res)=>{
    itemData.getItemById(req.params.id).then(data=>{
        res.json(data);
    }).catch(err=>{
        res.json({message: err});
    });
});

app.get("/categories", (req, res) => {
    itemData
    .getCategories()
    .then((data) => {
      res.render("Categories", {Categories: data});
    })
    .catch((err) => {
      res.render("Categories", {message: "err"});
    });
});

app.use((req, res) => {
  res.status(404).send("404 - Page Not Found");
});

itemData
  .initialize()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("server listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log(err);
  });

 


