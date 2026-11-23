import { AdfBoundingBox, AdfColorCandidate, AdfObjectTrackMessage, AdfObservation } from '../types/adf';
import { generateSyntheticSnapshotBase64, SnapshotVisualSpec } from '../utils/snapshotGenerator';

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.max(0.01, Math.min(0.99, n));
}

/**
 * Real Axis ADF Object Track message captured from an Axis camera (`com.axis.scene.object_track.v1`)
 */
export const REAL_EXAMPLE_CAR_TRACK: AdfObjectTrackMessage = {
  channel_id: 1,
  classes: [
    {
      colors: [
        { name: 'gray', score: 0.5811 },
        { name: 'blue', score: 0.2711 },
        { name: 'black', score: 0.2622 },
        { name: 'white', score: 0.2178 },
        { name: 'green', score: 0.1089 },
        { name: 'red', score: 0.0567 },
        { name: 'yellow', score: 0.0489 },
      ],
      score: 0.8378,
      type: 'Car',
    },
    {
      colors: [
        { name: 'gray', score: 0.5811 },
        { name: 'blue', score: 0.2711 },
        { name: 'black', score: 0.2622 },
        { name: 'white', score: 0.2178 },
        { name: 'green', score: 0.1089 },
        { name: 'red', score: 0.0567 },
        { name: 'yellow', score: 0.0489 },
      ],
      score: 0.1222,
      type: 'Truck',
    },
    {
      colors: [
        { name: 'gray', score: 0.5811 },
        { name: 'blue', score: 0.2711 },
        { name: 'black', score: 0.2622 },
        { name: 'white', score: 0.2178 },
        { name: 'green', score: 0.1089 },
        { name: 'red', score: 0.0567 },
        { name: 'yellow', score: 0.0489 },
      ],
      score: 0.0722,
      type: 'Bus',
    },
    { score: 0.0211, type: 'VehicleOther' },
  ],
  duration: 1.399,
  end_time: '2026-11-12T16:49:01.087023Z',
  id: 'a9471391-aa82-4c1f-9fcb-e44995e31853',
  image: {
    crop_box: { bottom: 0.2829, left: 0.9522, right: 0.999, top: 0.2436 },
    data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCABWALYDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzO38bXehSeZMb22kRsj7Q7Ag+2RxWlpHjnVfEEeoJp01y/myq1z9jRmZcdD8tclaf8JxeanDpmoAwi6GIf7TRI9xJA6v0HvXuvwq+COs6Npc090sLzXcWJI7S7WOM/MCMup69+hHWuGpQpxWiMbW0R5p4Ltvig99qdzpNreRLakmTztqSoANxOxuTxzyOa6DUPip8RYtOa6/tNLlwFfElnESo9/lIwf6dq7PVfCUuheJrq6u7gIJmxPZOZHjnjxj7/TsPert/f6Jreh29tcaZFZSyMLSC2icmSVcqAAwHQ9Pm6YrKNKM5aoupRV22eV23xh125fbqPhrwvcCQ5eWaxGSfU7ccmu28HaV4N+IWiQXmtaxpPhTVWkdGsoNOmWNRnA+cSqDnrn9am8YRfCj4ei1S98O6pNrF6+bTTI5hPOwHVtpcBUBB5Y8846GvH/EPgT4gfF/WoZdQl0/wnpUEZkgS2PmNATkYKJ99uFPXHP1Fe9h8olU96Gh5tRwhq3ZH0HF+zHp17HDqOkeO7YwKfMjngtC6ZB6581u/vS6r8K/Dl5qF0+r3r6pK6qkdxFHJC0eBgkAAhsnnmuB8J+AvCHwutxcXXiib7bcKPm1W/NqjFTkkRZAHbtziluf2hPBFn53leKQ8qn5Yre0ln3EehK7a+npYGjh1++tdHLDFVJX9mvwPYtG0vTvC9lqdnpGtrqEd3bLD/psMsWzaGABLA8fN2PfoK8Jg/Z58V2moLcwaloGogSiURreFCcYxkED0qK6/bE0KzWeOztNcvp48FUkjhgj98sCxH4CpdM/bPtNQlIuvC03lqvDecknzDpwyVh/siurXOuNeuo8rRv6F4M+I2g2msx3GkTBryArBc2kvnFcMGIymcAhcc461414nhn0a9hiuNK1DT5ApEgubdlO72/Cvf9A/aw8GXIjNxp2oWLlfmeIDhu/Run/Aa9J0L4ueEfGHlR2HiS3aeQcW94qnJ9BuAJP4Vx/V8BOTvdXD65JLlnE+JLu7i1SyjitpXilEySF8nICtkjHWu2i8VTxxZtfEdykef9XJKVIJ68GvpPxH8FtB8cRwXVroWjXMbB2aWxnMMjt2IKj8+K8k8Vfs+DT5nayuL3S/m/1epRCSIewkX+tY1MqhP+DJSNI1Iz2OesJPEWrWwEcFnqsGCF8+OCU+/B5qHUdIu2j8y78EwoM8PZI8IU+uFYjt6VzmqeB9b0BGuJ7NpYI1DPe2WXiUE4GWXp0qDTfEGs2Uamy1e6iizkKkpK/lXl1cHUo/HGyNNUdHJe6FBGI59H1Gz29PnV/1IBquU0SZ1eC4u7Y9/MIG7+dOT4ieIYYh5sltegdrq2Rs/kBVqL4iLeuv9o+HNNuI16CENEf5muNxitwUk9yv/Ys8kQmt9f0qcKeA/wC7ZfzwTWhpnjnxfoZVLLU5poxwFtn38c/wuDUF1rXga7k8y50S/tWHe3uNwB+jVQ0zTvC3iLVY7DS9S1S1uGBK+bEG9e4PFZPD0qm47I7Sx/aH8X6TKftsEdyp6C8tQNo9ipBq9Z/tO6RqsUg1Tw7DKCQpeGd4iRnqqsP61yGofDC+t4jDaeJHmJOVWYkDP0II7DvVKXwPrFoWO+K9yMEJbJKR9cEe9Dyem1dGiWm57Vpv7RPhHUJCwTWIZ0QKwSNJcD04/CivAr9H0QKlzEVfpsCFT7nAorn/ALMUdLs0U5H0gBpOro51K0Fxbq3Md5DvwT1IDDA/A1z+pfAvSbvbNo/ii+8PzTbiY7WUmMHpnaMEV6Lq/grxVp0CSXHhHUHRiSVtmW5UH/gBP8qxLrfYFG1XTtQ0wbcYuLd4+/bj/Oa8qPt4axehnHmi7nDWHhb40eALZX8O+Jl8RabHKC0N5skRu2MOSRnjIBroZfiLovhbT7KTxb4fh0fxaQWmu9O08NHEN2ONrY5DY65/Suk0nXbW2jkijvBIr5KxPICOfp0rC8c+BdK+Jdu1rqcaxXCKBHOHKsp9iAcfkfpXr4CvOVRKSsbRlCbtV0R5JrXwL+CvxC1W8vNO8a3eh3LfvJ0a4MYJbPK+aPXtzWKf2NdHkZ0sfiMt7cYDIkUiucf7oYk8e1ddoX7J0Vpqdx/b3iFjpoOEsrCNWmcc/emKKeuO3rXq2g/BrwZpkXl6XpKWdyMAXEsrSyYHQ5fP6Yr9Iw1WpLSpy29DzK8405ONN3PmS8/Yv1ZVdrPxDDezDILXVntA9MHdx37GsW7/AGX/ABzpUUssZ067ijUcrKVLHuBxgfjivp2+tJ9H1aWGKUrLCw2yL349Kni8UazG5tJHWXOAQ8AB59+K9Plwsvih+LOdYipHdHxR4k8D6noYEOp2MmnXMg3BZB98A9VIOCPpWVBZSRD5ANwPTcP8a+yLjxxoPjGSHTtX0m31GCU+Xv27R35LetU9S/Zh8DeJA7aPrNxod2qgGC7Teq+nJ/HvXHUy/DVX+6ny+ptHEwa99WPk1rOSMnecnOPT+tNkMunI0wMkWGGNx4J/Gvf9d/ZA8X6Y/wDxLb2x1a36g7zG2OccHNea+J/hd4t8NxeVrWh3CxsG+aGPzUAHcspODXn1coxUNYpSXkzpioT2ZPpnxE1fwtHDc6dqNzYrJEjItpO0SliP4gvDY969o+Hv7U/iy5jnj1qzg1u0QK2xiEkUfdJ3Yx+QHXrXzuZIPsttA7ssyAqY3UgqO3Fdp4Dsbi7eyjt75bI3F7HbTMU3ZjZJOMEHuFPUdK8+dOdJO8Wmcs6UYpto+2PAPxO8F/E+Fo7RJdMuwmyXTHCbpMfwgNkHPr3rzjx/8DdO8ZTTXfhK1Tw5r1tk3On3TBFlY9cqM4yOmOOe3fgNV+CKx6qLvSfEDwKrfu5s/vIRjkgr15+ldd4f+Keo2j22keKmFhrFvmC0105ZLyPnhuMY7kk5Gfc1WGxrb9lUd0+5zxlUoe9B3R43dadJbXtzp2oW5tNRt22SxMNpB9h3HvVT+zF7EV9B+NLS1+JEYs7+CK31mBGP2iJSJXTPDRc/NjByD615XqPw71vT5pFhtZNStV+5NCVV39cpnIIzWGPwcafv09mejFxqK8TjrjTgsDcA+9aHw/8ACxS7l1fzpo3U7YggwoHOcnvSeTc2U2650u7yrbSjwsVPtxXSD486jZw/ZpdG0yTy+AHUxkevy+teClyO7RVmjUNzImR5odc9wM1TZ4lkZzHsZvvNGShP5VetfjD4K1Z1XVdCksCwAMqSbufwwa0Y7jwBriKuneIkidzgCUspz9GAr1KeJp7PQ0SPNPEqaTaXcUoj1K6Lpgv9p+7jHGOvp+VFd/qfwSfVY1lg1aGWMnhk2sPzyKK2dSi3fmN042Pb7HUpNNQzW17c6ezDLeTMy/yOK2bP4l6hb/Na6jJeSTfKRcRiXgZ7kHj61x/g7xnoevWr2r6vdWbscNvjjvoGPPHyhWxiofFHj7QPDmrwWUGvWVy8ibtqWcltjGcghgR265/CvgPqleN7BCE3ex6EnjTT7yJxrHgvQb+Rhhp0txE7c9SVHX6Vx407TJdRvbuzsV0izGHis1lZ1iwOTluTnrTNL8UWOpWpkRo3Cnl4ZFcHn0+lZfhPXhqXiPVdEv5THqMMpe2jmwBPCfm+U+oBB2nkD1r1cq9pCb5zCqpuNnsX5L+GVba9S4WS1uBlZBzkYByPzGayry0vvE0LmOMxQqeZGwFUA9SeMVZ0XSDFo0VnLMpi06SeOSaZiqRRqzHJYgYwgBJ6cV8ZfF74o6r8ZPEutWsWv3Vj8PrO6lstOsNNaRLe/iRyFldON7OAGywOM8Yr6iVSSbsTGmpK59U3h8OrdG3uvFOjLdnA8ie/QnJGRgDPOOauSaBc2UaTROZbbgrLE4dG+hHb618bD4M3Z0VtXi8LXy6aBuFwt0PNA6Z2ltw/KtX4feOPEPwz1R1s9av5ICEQ2GpJ+4ixnIdT82CDjII6d6ftqsVcxlRbTaPq288P6TrdrAL208sWzFo0ifywCfYdegp02vm3QxQrlP8Abxk/j1pnh/xRp3jvw/a6/pmBDI2yaDBzDIPvD3Hoal13RxDE15CwlifBURg98dBVU8XOotzkhTTYWnjG8s2bAMQbjcnJJ962rT4k38cb+bHFcKwAAPHPfIzXG29tIzbMjcxwM1fvNNl0+doZ1AkABO08c81ssbVp7SOhUU9ToL7UvBOvQyf27o2myu333ZY4mz7FiP61hN8F/h1rcZvNAvf7JuFYMJbafzVRs5GBnAIx1Uj8qy7vSrXVSEu4RPEpBA3EEHn0qvougy6BKwiu1ntzucRPAuVYnrn6V2Rzaq42qO68yJQcfhZP8S/grrN5qFlrPgW7W11f5mvI7eXbBK+OHEY3BScHPUEntznof2bfhX4g8Wa+2m/ETwvc6lD5jKt3JGksMAOSSZOgP3jj2UY6YNFku4N9zCphRWw56BvbFb2veJfFmr+Fbuwtr+0hsSNsdvdB8u5PXgjnnrXHXxdGaXJFKXcOSdW0J6IqfGzwBD+z74n0y0XUbm58P6mVMMr5H2JxuztYnAz2xng4PuWVvc+J4iLeX7HrMALQXMX/AB736cEAnPBx19CfeuAPgjW/ElikHj/UBqlxZny7NpWLkR9h5m7cQCSMHpW/4QXQ/DaG1j1XWNHdHLR3E5W4tkPfgAMBjj8q+lqY7D4/DQpVEueK1fcrGVUnF01axsabq148slrc2weSFts1vNDko3PX/GtRLjStScnUNEsr4ACNYJrZR3Oc5GaTXPh+fE81veastr4hhTG2bTrkxPKno2fp/e45ro4fCnhuGwgsJNHls3t02QK0zCVFzk/Pk5575r5HF5RKbbpzM6eJTZwN38M/A2pSSNP4ftImboLUNFs+m01zHiD9nrwteALpsdzpDjnzVn80EfQ/4ivU9W8BXTzLJpM0axkcQXTnI9cH+L8SKxJ7rUNHcRX9s0ZTkvw6Dn1UmvAq4LGYfV6o7lJS1R5Fefs8a3oz50TWZLmB8dYnRl+uDj8qK9a/4TOxtmJa9254CxoxH6CiuNYiqtHAtNdT0a8/Ze+Gt1EfsunXelztx5lpduOPoSa4nxn+xPofiNYWsPFeq2VxEoUS3ISYAemBtJxxXoWn/HawYOupeHb+3IbIe2ZJuPfBX+RrUtPjH4LuiBPrD6Ux4AvrZ4wPx5H617VLMUuz+R3QxHLqj5h1n9hXxpYA/wBh+K9L1QFTn7dC0Te3PzD8a5vx9+zz8VfD9rBfwaZPqBsE/ez2t8lwXVVAVlJCsSBkEbcccV90af4q0DVX8qx8Q6XeSN9xYbhGcj6A1vwWFyGLpskxxlWDGuxYrDy1dNL0K54T+JaH5c6v8evE03g7xDoAtYUvtRt5LZp54wkio4KyqUOQxZSRkAEZqj8HdMvPCNuuv21ik0GnBYY3DAuGxhmVT15bP51+k/xI+Dfhj4i6NeW+teGrSS+kiKw3Zi8qVGHI+cKSBnrwetfHnxk+G8fw7+Mj2Gm6fPb6PqVvFPpdjop+zhZREscoJcFeXV3zjuOnWtPZ0qsebDybt0ZnUoxUL0tjE1HXZPGUc0LX0Yg86NrlrbDqQQSFbb91jjocdKw/iJ4Xv/GmkxXdp4ffS302LAkk5luIwPukDrjGR9TXceHfDNx8PfiNDp3iQXryajZ4GkWtnFHsjZSN1xIW2zEfPzj+HPA68XJosniu8umsotY0yeQvPBHp+sq4ngBPyqDw20Yyo561jFNK5wwl7ziU/wBmnWrmx8V32hSZbTdVs5Jo24AE8RU7R3yVYnH1r6M0t44oX07UIpEVlaNHlGGQH+Ic44zXyd8F9ft9O8caK0X+kXVnPI/2UBi0sUibHxxjIC5619S33jbTptGgv7pYtNE5YGOQh3iPVeBycg+ledKo6VX3TllF+1dhmseEm0fUhHC7SwHgS5zn3p03hm5hVpZU3lhlnByePatXw34j0rXtGlS21KK+njHKxS+ZIxPOSAPl68A0+LWJbWQi7jBH/PNev4mu6dSNVXjubRm1ozmbbQrqS4lSCAyFeeoHH41qaV4UvJZJXubZ49u3YmQd3PJ69Kr6r8SLTT7qRHuLdQI1PnxsGJ4PAABGcY5zXLWHxHuPEFxcO88ktyikpIkaxDb34HUV41fEzp3SR0qmmrnXyabd2F3NA4MKyD7o6Ec9Pypt/p99Hpc8sW9gCAhZsZPtxjtXPXXiS4tNQsWe6bWLgDfAoQwhflY8/KQcY9c81vDXo9a1qwMrSxx2s7H7NbgOy4XkeuTjOMYry3iZvUtU7bkmmapBJc/YryUC6YYjjkX5wc8kn0wD2qjqmiRWvmSXAxAzEKx5LVcedJ/EV5qU0H2czsIY/Njz5aAckjrz/Wujn0221GzkYR/bFQ5SN3WJicckA13YbHui9TOrQTPMNPF5pVxMdMvJ7eHdlQpIH4g9fxrvNG+J+ouu3U40uVHHmxIV3AD8vzFYPiJdRtfDeratpFjFPc20a+RaSBv3pLAHIyCeM1meDvF95q/hdtS8TWdtpc7yiOCytUczY3FWLKfTGc8ce9e7/afLDmucksJ1PW7Txpp2rWjR4KGNlMmI9hGc9WBxjj2rT1U6PDpckemXLzGbAEM5EiyMeDtflePQmvN7UWkVtc3puGms+EaDy8fg359K51lufDdwj6RJcvpuoyCY2CJgBg2QenHPpjpzQs2lKLJjQktmej+LPhN4s8L3X2u48PfbIJsJHNp6rIvTONoGR0PJUUV6Zpnj7X/B/h6G/wBT8XaJFPIUt20m9uGupLc7S3ztFkhuOeMfN14FFdFLGYapBTnFXfmdtOFRwT5Tx9NLupxMIYFR0HzYk3HPbHSqUdncELJ5W9zwBIgb8MGtbS/E9/cX8eh2+ntdXM5fzzEyCWDByGyMYwD+PSo7XQ9N8OTf2fdaws2vXb70aaTaY1BB+VRxn1zX5tHmRlKF9EylP4K07VbWJ7zR7QugLMYlFu35pg1BB4Oh0qKSPTL/AFfSPMOfMsdQk6jpwxIqXU/iZp099PHomnX+vLa71ur2OPy4oSOuVPL55xjFa41Rr9ba3VFjsdySC6uI9kYVlBwTnqegHXNdccRUhuwtKOhm2OsfFTRwV034hQ3u4fLDrNtvUn3OGx9R+Vec/H/wv8X/AIvJ4fn1Gw0HV00KG48ltHlMLymQofnOcnGzgBR95u+MezC90y71NLGzSYuU8xbhbdkQKCTwWAz07VW0DxRp2vRLLbXItJnk8pYLhh5rNj+6Ome1dlPMatB3USueUJXPKv8AhJL8eFrbQvEvw6m0w6evm6bqzu7PZso3MC5BZw5BXquA1eCanrtjD4Ol0GyuzNq4vlitVWN4dsZ3M0yzNgDoFIOPvCv0A0a3861aSeaSUsxAjEm0cexrLvPC2keK4ftOq22mtDExCwXNqkrn6HGe46V6VDN48ri1YUJx1ufJv7OP7K3iP4jG18Uya3aeFdBjH7qS3mWa+n5PCorfu+QMlvfivdPiH8INIs9Ss49J1JrrX7qT9zp14iieA9WkBBAI6nBH48VV8VfBDwBpuhT3MFnd6TeQcJd2txIm0n2LMOeByO9eTyeD20aH+0bfxW13Gz8Q3C+YwXOBluo449Kv61GScou5pFSXv3vc6y3/Zw8Y/DlIbazuLPxAdTMklstq5gmYggEEtx19M456d+S8Rf8Lj+Ht3eXEWg6xYaInzTJPbi7hjO3BPmYPHpg4zXoGg/tA+LbTxF5/2jTtYk0tSiW7W4jKKy8spHNdjB8epNY8K6ja6nohSO4yPP0+bYqjduIKMQCdwOSAc89amhi6cZXqR37FQSbbkfJEetS6lNpiXonWESsryPwGY+vpjFdvoFmIPEOmwTMBG88kLLuxnauWB/MV7P4Q8RfDe28H6H4c12ytF1J757i5fUbMtEN24qC6qSTjAyCvbnGRVrT/gv4X8XXCT3OpHT72Odpbez0dtgRcBW/duM4O0HjB69a1rSw8tpW9TaNmeE3vi24dPsksC+RdMxhjZw/yjJABGStaz+M/EMXiiC9bTYY11AKY7diGRScru3jABx19utX/FX7PGo+CdY1C4tJF1KAzKllcMxDKT6cjnnBzwO2aqeCvDmsWWqWr3UcUrQm422ITL7xn5gf4jkHoD1rklQg1eGqOnl6Dtb8TQ6Pex6VFd3Go3uU3GFnQb9w3KVPUejd67xvHVo/iG7v0tzBJp6rJcPNMVUtt5Cr3+YY4rg/AFlBo1p4h1DV5LkahbrEm4Iw8lxKxZHxzyOnUdK4RL27sbxslQ007iWWTnD5J5+tcE8No/IcqfMmz3rVfiA11pGmpFAlzczKJLlS5AY545/WorPxHFDeRQRWcOnWswYzTTDCSEfNhcdsjmvKLvx7MbtICtuLSH5YmiXLKMd2HXpTr3Uo7GKwvJb5N/zNCJju5PB+WublnazJ5bKx6Ba/EHUH1SODyJLfTpXdmt42BVxg9sdRgHrV8eNpmvUgtZT5Msf7uJoyPmGdwI6Vy0U6azdr9jgkhYZCpGN+3II+YnH6Vqafcx6jp2of2deywzRyojvFkEY5Kn8j+dYyqOMWkS4rodRaaNFBaCW+htI5WCjy7mTZIudxP3Tznjr0orRW/ttUsYrhElmEarFJhCzB8Hr+VFed9akjJxVzk7PVdag8PWXjK21RdPurmSUMlvbKWZRn77E4f7pONq9a53xR8dtX1rS7uxvYbdZzDFI2oWsCxTygkMFJHCj1xnNFFfR0acJatFUoRau0RQfEzVZ4mso1LWkqG4KrP9mzjqG8tORkcZrNuPjNrGrMltqUVvLJAqOskanecY2fOTlcZ7D1ooraVGm1extOnH2blbU92t/F+tXvhrQ9T86GILZTpeJHEAZgMgYJBxg/z7V5rqHjBrVLKFASLEx3QmaPMjNsGEUlz5a8dV5oorzqEIuVmjgUU0j1P4ffFxvHN3fLFaSaWbJTPJbxssiTcEgbyoZeR2FVNB+MUni/wteav9k+xXdtgRpGcqQWI5JOc0UVk6cU3YSiuU8S+PHxf8TM8WiXM9uTMCZXt4RHuHBwT36DoBXkumeJLqxu45SwIiBKqqgZPv60UV9BShFU7JFvTQm0n4vW+o69HPc6c7XseIw6MFRxnGGAwSPxr6K+G3iufxTp1x4duY4Io9uR5cC7F53HHOc9ep70UV5eLSjqjKTavYk8S+Ef8AhCtZkjW4S5S5tfOtVeEN5ToBuznPXPB5x6VV8O+LLuLSdNkiiSRYxxJLM/nYBxgODx0oorjk3KF2Qtz2H4eeOJPG+ipBPbqLnTzLgvhkbKkDt1BxzjtWD4e8OWkNtpN3BDHBdW8+dyjIKhzkcjPP1oorDCVJ+8rnZSk3HU5qYXOk6P4gtdKuAIHdpLuO6jVvM3ZyAcZ5z1zXh+o6Vaa/bWos4zpsKhpHiU797BmBJJ5OaKK+lTvTbZ6Ef4bZk6laWlnHbeXGyvKpDANleO9V5EM1zamUmRIV4U+xyKKK5Ohkei2+oXOgaFNLauIri7TzmmUZbOMDrXT+CvD1/J8Mm8R2V1BbZZ5Lu3MeRcANjOex60UV41Z2Wnchbo7PwZ4Xiumvle4uftjuGUJLtjWMdRyCc5YflRRRXzk5y5nqEtz/2Q==',
    id: '23cf0093-fee0-484c-b1e5-4df754c3e167',
    timestamp: '2026-11-12T16:49:00.787027Z',
  },
  parts: [{ object_track_id: 'ae04fd0a-aad9-4988-808f-88080994d4cd' }],
  path: [
    {
      bounding_box: { bottom: 0.2422, left: 0.8098, right: 0.8473, top: 0.2141 },
      timestamp: '2026-11-12T16:48:59.687060Z',
    },
    {
      bounding_box: { bottom: 0.2453, left: 0.8232, right: 0.8616, top: 0.2156 },
      timestamp: '2026-11-12T16:48:59.787056Z',
    },
    {
      bounding_box: { bottom: 0.2484, left: 0.8365, right: 0.8759, top: 0.2172 },
      timestamp: '2026-11-12T16:48:59.887054Z',
    },
    {
      bounding_box: { bottom: 0.2531, left: 0.85, right: 0.8884, top: 0.2203 },
      timestamp: '2026-11-12T16:48:59.987051Z',
    },
    {
      bounding_box: { bottom: 0.2578, left: 0.8634, right: 0.9009, top: 0.2235 },
      timestamp: '2026-11-12T16:49:00.087050Z',
    },
    {
      bounding_box: { bottom: 0.2594, left: 0.8785, right: 0.9169, top: 0.2266 },
      timestamp: '2026-11-12T16:49:00.187046Z',
    },
    {
      bounding_box: { bottom: 0.2593, left: 0.8849, right: 0.93, top: 0.2229 },
      timestamp: '2026-11-12T16:49:00.287046Z',
    },
    {
      bounding_box: { bottom: 0.2646, left: 0.8976, right: 0.9446, top: 0.2259 },
      timestamp: '2026-11-12T16:49:00.387040Z',
    },
    {
      bounding_box: { bottom: 0.2694, left: 0.9124, right: 0.9595, top: 0.2298 },
      timestamp: '2026-11-12T16:49:00.487038Z',
    },
    {
      bounding_box: { bottom: 0.2753, left: 0.9232, right: 0.9749, top: 0.2352 },
      timestamp: '2026-11-12T16:49:00.587033Z',
    },
    {
      bounding_box: { bottom: 0.279, left: 0.9378, right: 0.9897, top: 0.2395 },
      timestamp: '2026-11-12T16:49:00.687032Z',
    },
    {
      bounding_box: { bottom: 0.2829, left: 0.9522, right: 0.999, top: 0.2436 },
      timestamp: '2026-11-12T16:49:00.787029Z',
    },
    {
      bounding_box: { bottom: 0.2868, left: 0.966, right: 0.999, top: 0.2474 },
      timestamp: '2026-11-12T16:49:00.887028Z',
    },
    {
      bounding_box: { bottom: 0.2907, left: 0.9797, right: 0.999, top: 0.2512 },
      timestamp: '2026-11-12T16:49:00.987023Z',
    },
    {
      bounding_box: { bottom: 0.2948, left: 0.9935, right: 0.999, top: 0.255 },
      timestamp: '2026-11-12T16:49:01.087023Z',
    },
  ],
  start_time: '2026-11-12T16:48:59.687060Z',
};

interface TrajectoryTemplate {
  id: string;
  channelId: number;
  startTimeIso: string;
  durationSec: number;
  steps: number;
  startCenter: { x: number; y: number };
  controlPoint: { x: number; y: number };
  endCenter: { x: number; y: number };
  boxSizeStart: { w: number; h: number };
  boxSizeEnd: { w: number; h: number };
  classes: Array<{
    type: string;
    score: number;
    colors?: AdfColorCandidate[];
    upper_clothing_colors?: AdfColorCandidate[];
    lower_clothing_colors?: AdfColorCandidate[];
  }>;
  visualSpec: Omit<SnapshotVisualSpec, 'timestamp' | 'cropBox' | 'channelId' | 'confidence'>;
  includeSnapshot?: boolean;
}

function buildQuadraticTrajectory(tpl: TrajectoryTemplate): {
  path: AdfObservation[];
  bestObservation: AdfObservation;
} {
  const startMs = Date.parse(tpl.startTimeIso);
  const path: AdfObservation[] = [];

  for (let i = 0; i < tpl.steps; i++) {
    const t = tpl.steps === 1 ? 1 : i / (tpl.steps - 1);
    const inv = 1 - t;

    const cx =
      inv * inv * tpl.startCenter.x +
      2 * inv * t * tpl.controlPoint.x +
      t * t * tpl.endCenter.x;
    const cy =
      inv * inv * tpl.startCenter.y +
      2 * inv * t * tpl.controlPoint.y +
      t * t * tpl.endCenter.y;

    const w = tpl.boxSizeStart.w + (tpl.boxSizeEnd.w - tpl.boxSizeStart.w) * t;
    const h = tpl.boxSizeStart.h + (tpl.boxSizeEnd.h - tpl.boxSizeStart.h) * t;

    const bounding_box: AdfBoundingBox = {
      bottom: round4(clamp01(cy + h / 2)),
      left: round4(clamp01(cx - w / 2)),
      right: round4(clamp01(cx + w / 2)),
      top: round4(clamp01(cy - h / 2)),
    };

    const ts = new Date(startMs + Math.round(t * tpl.durationSec * 1000)).toISOString();

    path.push({
      bounding_box,
      timestamp: ts,
    });
  }

  const bestIdx = Math.floor(path.length * 0.58);
  return {
    path,
    bestObservation: path[bestIdx] || path[0],
  };
}

function createTrackFromTemplate(tpl: TrajectoryTemplate): AdfObjectTrackMessage {
  const { path, bestObservation } = buildQuadraticTrajectory(tpl);
  const endTimeIso = path[path.length - 1].timestamp;
  const snapId = `snap-${tpl.id.slice(0, 8)}-89b1`;

  let imageField: AdfObjectTrackMessage['image'] | undefined;
  if (tpl.includeSnapshot !== false) {
    const generated = generateSyntheticSnapshotBase64({
      ...tpl.visualSpec,
      channelId: tpl.channelId,
      confidence: tpl.classes[0]?.score ?? 0.9,
      timestamp: bestObservation.timestamp,
      cropBox: bestObservation.bounding_box,
    });

    imageField = {
      crop_box: bestObservation.bounding_box,
      data: generated.base64,
      id: snapId,
      timestamp: bestObservation.timestamp,
    };
  }

  return {
    channel_id: tpl.channelId,
    classes: tpl.classes,
    duration: tpl.durationSec,
    end_time: endTimeIso,
    id: tpl.id,
    ...(imageField ? { image: imageField } : {}),
    parts: [{ object_track_id: `ae04fd0a-aad9-4988-808f-${tpl.id.slice(0, 12)}` }],
    path,
    start_time: tpl.startTimeIso,
  };
}

export function createInitialSampleTracks(): AdfObjectTrackMessage[] {
  const templates: TrajectoryTemplate[] = [
    {
      id: 'ad57dd04-cbe5-44df-8de3-222d1d33c3e9',
      channelId: 1,
      startTimeIso: '2026-11-12T16:46:12.140000Z',
      durationSec: 16.4,
      steps: 18,
      startCenter: { x: 0.12, y: 0.72 },
      controlPoint: { x: 0.44, y: 0.56 },
      endCenter: { x: 0.82, y: 0.41 },
      boxSizeStart: { w: 0.085, h: 0.24 },
      boxSizeEnd: { w: 0.055, h: 0.16 },
      classes: [
        {
          type: 'Human',
          score: 0.9612,
          upper_clothing_colors: [
            { name: 'blue', score: 0.941 },
            { name: 'black', score: 0.121 },
          ],
          lower_clothing_colors: [
            { name: 'gray', score: 0.892 },
            { name: 'black', score: 0.341 },
          ],
        },
      ],
      visualSpec: {
        objectType: 'human',
        primaryColor: '#2563eb',
        secondaryColor: '#334155',
        label: 'Human',
      },
    },
    {
      id: '7c19e451-3b88-4c19-a104-55d8f01a8821',
      channelId: 1,
      startTimeIso: '2026-11-12T16:47:19.020000Z',
      durationSec: 12.5,
      steps: 20,
      startCenter: { x: 0.88, y: 0.36 },
      controlPoint: { x: 0.58, y: 0.48 },
      endCenter: { x: 0.24, y: 0.78 },
      boxSizeStart: { w: 0.17, h: 0.14 },
      boxSizeEnd: { w: 0.26, h: 0.21 },
      classes: [
        {
          type: 'Truck',
          score: 0.934,
          colors: [
            { name: 'white', score: 0.912 },
            { name: 'gray', score: 0.214 },
          ],
        },
        {
          type: 'Car',
          score: 0.081,
        },
      ],
      visualSpec: {
        objectType: 'truck',
        primaryColor: '#f1f5f9',
        secondaryColor: '#e2e8f0',
        label: 'Truck',
      },
    },
    {
      id: '3e89a112-90ef-441b-b082-1940cd77e503',
      channelId: 2,
      startTimeIso: '2026-11-12T16:48:05.880000Z',
      durationSec: 8.2,
      steps: 16,
      startCenter: { x: 0.86, y: 0.74 },
      controlPoint: { x: 0.51, y: 0.68 },
      endCenter: { x: 0.14, y: 0.54 },
      boxSizeStart: { w: 0.11, h: 0.21 },
      boxSizeEnd: { w: 0.08, h: 0.16 },
      classes: [
        {
          type: 'Bike',
          score: 0.912,
          colors: [
            { name: 'yellow', score: 0.884 },
            { name: 'blue', score: 0.412 },
          ],
        },
      ],
      visualSpec: {
        objectType: 'bike',
        primaryColor: '#eab308',
        secondaryColor: '#0284c7',
        label: 'Bike',
      },
    },
    {
      id: 'c182f904-119b-4820-9c44-0092a84e710b',
      channelId: 2,
      startTimeIso: '2026-11-12T16:48:32.450000Z',
      durationSec: 5.4,
      steps: 12,
      startCenter: { x: 0.18, y: 0.34 },
      controlPoint: { x: 0.52, y: 0.31 },
      endCenter: { x: 0.84, y: 0.36 },
      boxSizeStart: { w: 0.15, h: 0.12 },
      boxSizeEnd: { w: 0.16, h: 0.13 },
      classes: [
        {
          type: 'Car',
          score: 0.891,
          colors: [
            { name: 'red', score: 0.842 },
            { name: 'black', score: 0.189 },
          ],
        },
      ],
      visualSpec: {
        objectType: 'car',
        primaryColor: '#dc2626',
        label: 'Car',
      },
      includeSnapshot: false,
    },
  ];

  // Put REAL_EXAMPLE_CAR_TRACK at the end so when reversed in App.tsx it appears first!
  return [...templates.map(createTrackFromTemplate), REAL_EXAMPLE_CAR_TRACK];
}

const SIM_PRESETS: Array<{
  primaryClass: string;
  visualType: SnapshotVisualSpec['objectType'];
  primaryColor: string;
  secondaryColor: string;
  colors: AdfColorCandidate[];
  boxSize: { w: number; h: number };
}> = [
  {
    primaryClass: 'Human',
    visualType: 'human',
    primaryColor: '#ea580c',
    secondaryColor: '#1e293b',
    colors: [
      { name: 'orange', score: 0.91 },
      { name: 'black', score: 0.32 },
    ],
    boxSize: { w: 0.075, h: 0.22 },
  },
  {
    primaryClass: 'Car',
    visualType: 'car',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b',
    colors: [
      { name: 'blue', score: 0.88 },
      { name: 'gray', score: 0.24 },
    ],
    boxSize: { w: 0.18, h: 0.14 },
  },
  {
    primaryClass: 'Bike',
    visualType: 'bike',
    primaryColor: '#a855f7',
    secondaryColor: '#facc15',
    colors: [
      { name: 'purple', score: 0.85 },
      { name: 'yellow', score: 0.42 },
    ],
    boxSize: { w: 0.1, h: 0.19 },
  },
  {
    primaryClass: 'Truck',
    visualType: 'truck',
    primaryColor: '#eab308',
    secondaryColor: '#ca8a04',
    colors: [
      { name: 'yellow', score: 0.93 },
      { name: 'black', score: 0.19 },
    ],
    boxSize: { w: 0.24, h: 0.19 },
  },
];

export function generateSimulatedTrackMessage(seq: number): AdfObjectTrackMessage {
  const preset = SIM_PRESETS[seq % SIM_PRESETS.length];
  const now = Date.now();
  const durationSec = round4(3.2 + (seq % 7) * 1.4);
  const startIso = new Date(now - durationSec * 1000).toISOString();

  const leftToRight = seq % 2 === 0;
  const startX = leftToRight ? 0.08 + (seq % 3) * 0.04 : 0.9 - (seq % 3) * 0.04;
  const endX = leftToRight ? 0.88 - (seq % 3) * 0.03 : 0.12 + (seq % 3) * 0.03;
  const startY = 0.3 + ((seq * 17) % 45) / 100;
  const endY = 0.35 + ((seq * 29) % 45) / 100;
  const ctrlX = (startX + endX) / 2 + ((seq % 5) - 2) * 0.08;
  const ctrlY = (startY + endY) / 2 + ((seq % 3) - 1) * 0.12;

  const hexSuffix = (100000 + seq * 7919).toString(16).slice(0, 6);
  const id = `${hexSuffix}a4-81f2-4b09-9e11-440291bc${String(seq).padStart(4, '0')}`;
  const score = round4(0.84 + (seq % 14) * 0.01);

  return createTrackFromTemplate({
    id,
    channelId: (seq % 2) + 1,
    startTimeIso: startIso,
    durationSec,
    steps: 14 + (seq % 8),
    startCenter: { x: startX, y: startY },
    controlPoint: { x: clamp01(ctrlX), y: clamp01(ctrlY) },
    endCenter: { x: endX, y: endY },
    boxSizeStart: preset.boxSize,
    boxSizeEnd: {
      w: preset.boxSize.w * 1.1,
      h: preset.boxSize.h * 1.1,
    },
    classes: [
      {
        type: preset.primaryClass,
        score,
        colors: preset.colors,
      },
    ],
    visualSpec: {
      objectType: preset.visualType,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      label: preset.primaryClass,
    },
    includeSnapshot: seq % 6 !== 5,
  });
}
