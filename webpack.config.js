const path = require('path')
const ExtractTextPlugin = require("extract-text-webpack-plugin")


module.exports = {
    // watch: true,
    entry: './src/index.js',
    devtool: 'eval-source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: './bundle.js'
    },
node: {
  fs: 'empty'
},
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: [{
                        loader:"css-loader",
                        options: {
                            sourceMap: true
                        }
                    }]
                })
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin("stylesheets.css"),
    ]
}
