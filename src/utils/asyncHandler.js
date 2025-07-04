// ASYNC FUNCTION RETURN PROMISE, WE CAN USE .THEN.CATCH OR TRY CATCH WAY

// USING THE PROMISES WAY
const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err))
    }
}
  
export {asyncHandler}


// USING THE TRY CATCH WAY

// const asyncHandler = (fn) => {
//     async (req, res, next) => {
//         try {
            
//         } catch (error) {
//             res.status(error.code || 500).json({
//                 success: false,
//                 message: error.message
//             })
//         }
//     }
// }